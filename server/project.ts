import { build, transform, type Loader, type Plugin } from "esbuild";
import { posix } from "node:path";

const ALLOWED_BARE_ROOTS = new Set([
  "react",
  "react-dom",
  "@skbkontur/react-ui",
  "antd",
  "@mui/material",
  "@chakra-ui/react",
]);
const RESOLVE_SUFFIXES = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx"];
const MAX_REPORTED_ERRORS = 8;

const LOADERS: Record<string, Loader> = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".css": "css",
  ".json": "json",
};

type EsbuildError = {
  text: string;
  location?: { file?: string; line?: number; column?: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loaderFor(name: string): Loader | undefined {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? undefined : LOADERS[name.slice(dot)];
}

function packageRoot(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

function allowedBareRoots(files: Record<string, string>): Set<string> {
  const roots = new Set(ALLOWED_BARE_ROOTS);
  const version = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i;
  try {
    const config: unknown = JSON.parse(files["playui.config.json"] ?? "{}");
    const packages = isRecord(config) && isRecord(config.packages) ? config.packages : {};
    for (const [name, value] of Object.entries(packages)) {
      if (typeof value === "string" && version.test(value)) roots.add(packageRoot(name));
    }
  } catch {
    // A config that is being edited must not fail the project check.
  }
  return roots;
}

function formatEsbuildErrors(error: unknown): string[] {
  const errors = (error as { errors?: EsbuildError[] } | undefined)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.map(({ text, location }) =>
      location
        ? `${(location.file ?? "input").replace(/^project:/, "")}:${location.line ?? 0}:${location.column ?? 0}: ${text}`
        : text,
    );
  }
  return [error instanceof Error ? error.message : String(error)];
}

const IMPORT_PATTERNS = [
  /(?:import|export)\s[^"'`]*?\sfrom\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
];

function checkBareImports(files: Record<string, string>): string[] {
  const allowed = allowedBareRoots(files);
  const errors: string[] = [];
  for (const [name, source] of Object.entries(files)) {
    const loader = loaderFor(name);
    if (loader !== "ts" && loader !== "tsx" && loader !== "js" && loader !== "jsx") continue;
    for (const pattern of IMPORT_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        const specifier = match[1];
        if (!specifier || specifier.startsWith(".") || specifier.startsWith("/")) continue;
        if (!allowed.has(packageRoot(specifier))) {
          errors.push(
            `${name}: unsupported import "${specifier}". Use React or the project design system.`,
          );
        }
      }
    }
  }
  return errors;
}

/** Syntax-checks every source file and bundles the merged project from App.tsx. */
export async function findProjectErrors(files: Record<string, string>): Promise<string[]> {
  const errors: string[] = [];
  if (!Object.hasOwn(files, "App.tsx")) errors.push("App.tsx is missing from the project.");

  for (const [name, source] of Object.entries(files)) {
    const loader = loaderFor(name);
    if (!loader) {
      errors.push(`${name}: unsupported file type.`);
      continue;
    }
    if (loader === "css") continue;
    if (loader === "json") {
      if (name === "playui.config.json") continue;
      try {
        JSON.parse(source);
      } catch (error) {
        errors.push(
          `${name}: invalid JSON (${error instanceof Error ? error.message : String(error)}).`,
        );
      }
      continue;
    }
    try {
      await transform(source, { loader, jsx: "automatic", sourcefile: name, logLevel: "silent" });
    } catch (error) {
      errors.push(
        ...formatEsbuildErrors(error).map((message) =>
          message.startsWith(`${name}:`) ? message : `${name}: ${message}`,
        ),
      );
    }
  }

  errors.push(...checkBareImports(files));
  if (errors.length > 0) return [...new Set(errors)].slice(0, MAX_REPORTED_ERRORS);

  const projectPlugin: Plugin = {
    name: "playui-project",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") return { path: args.path, namespace: "project" };
        if (!args.path.startsWith(".") && !args.path.startsWith("/")) return { external: true };
        const base = args.importer ? posix.dirname(args.importer) : ".";
        const target = posix.normalize(posix.join(base, args.path));
        if (target === ".." || target.startsWith("../")) {
          return { errors: [{ text: `Import escapes the project: ${args.path}` }] };
        }
        for (const suffix of RESOLVE_SUFFIXES) {
          if (Object.hasOwn(files, target + suffix)) {
            return { path: target + suffix, namespace: "project" };
          }
        }
        return {
          errors: [{ text: `Could not resolve "${args.path}" from ${args.importer || "App.tsx"}` }],
        };
      });
      pluginBuild.onLoad({ filter: /.*/, namespace: "project" }, ({ path }) => {
        const loader = loaderFor(path);
        if (!loader) return { errors: [{ text: `Unsupported file type: ${path}` }] };
        return { contents: files[path]!, loader };
      });
    },
  };

  try {
    await build({
      entryPoints: ["App.tsx"],
      outdir: "preview-build",
      bundle: true,
      write: false,
      format: "esm",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [projectPlugin],
    });
  } catch (error) {
    errors.push(...formatEsbuildErrors(error));
  }

  return [...new Set(errors)].slice(0, MAX_REPORTED_ERRORS);
}
