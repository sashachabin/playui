import { build, initialize } from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import vendor from "virtual:preview-vendor";

const packages = new Set([
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "@skbkontur/react-ui",
  "antd",
]);
let initialization: Promise<void> | undefined;

export async function compilePreview(files: Record<string, string>) {
  initialization ??= initialize({ wasmURL });
  await initialization;
  const remote = new Map<string, string>();
  const config = files["playui.config.json"];
  let configuredPackages: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(config ?? "{}");
    if (parsed?.packages && typeof parsed.packages === "object")
      configuredPackages = parsed.packages;
  } catch {
    // Continue compiling the source while the configuration is being edited.
  }
  const result = await build({
    stdin: {
      contents: `import App from "./App.tsx";
        import { createRoot } from "react-dom/client";
        createRoot(document.getElementById("root")).render(<App {...globalThis.playuiPreview} />);`,
      loader: "tsx",
    },
    bundle: true,
    outfile: "preview.js",
    format: "cjs",
    jsx: "automatic",
    write: false,
    plugins: [
      {
        name: "project-files",
        setup(plugin) {
          plugin.onResolve({ filter: /.*/ }, ({ path, importer }) => {
            if (packages.has(path)) return { path, external: true };
            const specifier =
              /^((?:@[a-z0-9_.-]+\/)?[a-z0-9_-][a-z0-9_.-]*)(\/[a-z0-9_.-]+)*$/i.exec(path);
            const name = specifier?.[1];
            const version =
              name && Object.hasOwn(configuredPackages, name)
                ? configuredPackages[name]
                : undefined;
            if (
              name &&
              typeof version === "string" &&
              /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(version)
            ) {
              const subpath = path.slice(name.length);
              if (!subpath.split("/").some((segment) => segment === "." || segment === "..")) {
                const external = "react,react-dom,react/jsx-runtime,react-dom/client";
                remote.set(
                  path,
                  `https://esm.sh/${name}@${version}${subpath}?external=${external}`,
                );
                return { path, external: true };
              }
            }
            if (!path.startsWith("./") && !path.startsWith("../")) {
              return { errors: [{ text: `Unsupported import: ${path}` }] };
            }
            const filename = new URL(path, "https://prototype.invalid/" + importer).pathname.slice(
              1,
            );
            const match = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx"]
              .map((ext) => filename + ext)
              .find((name) => Object.hasOwn(files, name));
            return match
              ? { path: match, namespace: "prototype" }
              : { errors: [{ text: `File not found: ${path}` }] };
          });
          plugin.onLoad({ filter: /.*/, namespace: "prototype" }, ({ path }) => {
            const ext = path.split(".").at(-1);
            const loader =
              ext === "css" || ext === "json" || ext === "ts" || ext === "js" || ext === "jsx"
                ? ext
                : "tsx";
            return { contents: files[path], loader };
          });
        },
      },
    ],
  });
  return {
    script: result.outputFiles.find((file) => file.path.endsWith(".js"))?.text ?? "",
    remote: [...remote],
    css:
      vendor.css +
      "\n" +
      (result.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? ""),
  };
}

export function previewDocument(
  bundle: Awaited<ReturnType<typeof compilePreview>>,
  settings: {
    route: string;
    dark: boolean;
    locale: string;
    outlines: boolean;
    afterSubmit: string;
  },
) {
  const json = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
  const script = bundle.script.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:${bundle.remote.length ? " https://esm.sh" : ""}; style-src 'unsafe-inline'; img-src data: blob:; form-action 'none'; base-uri 'none'">
    </head><body><div id="root"></div><script>
    globalThis.playuiPreview = ${json(settings)};
    document.documentElement.lang = playuiPreview.locale;
    document.documentElement.dataset.theme = playuiPreview.dark ? "dark" : "light";
    const style = document.createElement("style");
    style.textContent = ${json(bundle.css)} + (playuiPreview.outlines ? "*{outline:1px solid #4963bd80;outline-offset:-1px}" : "");
    document.head.append(style);
    addEventListener("click", (event) => {
      const link = event.target.closest?.("a");
      if (!link) return;
      event.preventDefault();
      parent.postMessage({route: link.getAttribute("href")}, "*");
    });
    addEventListener("error", (event) => parent.postMessage({ error: event.message }, "*"));
    addEventListener("unhandledrejection", (event) => parent.postMessage({ error: String(event.reason) }, "*"));
    function require(name) {
      if (!Object.hasOwn(globalThis.playuiModules, name)) throw new Error("Unsupported module: " + name);
      return globalThis.playuiModules[name];
    }
    ${vendor.script.replace(/<\/script/gi, "<\\/script")}
    (async () => {
      const remote = ${json(bundle.remote)};
      if (remote.length) {
        const imports = {};
        for (const name of ["react", "react-dom", "react-dom/client", "react/jsx-runtime"]) {
          const key = JSON.stringify(name);
          const module = playuiModules[name];
          const lines = ["const m = globalThis.playuiModules[" + key + "];", "export default m.default ?? m;"];
          for (const member of Object.keys(module)) {
            if (member === "default" || !/^[A-Za-z_$][\\w$]*$/.test(member)) continue;
            const property = JSON.stringify(member);
            lines.push("const value" + lines.length + " = m[" + property + "]; export { value" + lines.length + " as " + member + " };");
          }
          imports[name] = URL.createObjectURL(new Blob([lines.join("\\n")], { type: "text/javascript" }));
        }
        const map = document.createElement("script");
        map.type = "importmap";
        map.textContent = JSON.stringify({ imports });
        document.head.append(map);
        await Promise.all(remote.map(async ([name, url]) => {
          playuiModules[name] = { ...await import(url), __esModule: true };
        }));
      }
      ${script}
    })().catch((error) => parent.postMessage({ error: String(error) }, "*"));
    </script></body></html>`;
}
