import type { FileEntry } from "../types";

export const PROTECTED_FILES = new Set(["App.tsx", "playui.config.json"]);

const FILE_PATH = /^(?:[\w-]+\/)*[\w][\w.-]*\.(?:tsx?|jsx?|css|json)$/i;

export function normalizeFilePath(value: string): string | null {
  const name = value.trim().replace(/^\.\/+/, "");
  return FILE_PATH.test(name) ? name : null;
}

export function languageFromName(name: string): string {
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".md")) return "markdown";
  return "typescript";
}

export function fileKindLabel(name: string): string {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  const labels: Record<string, string> = {
    tsx: "React component",
    jsx: "React component",
    ts: "TypeScript",
    js: "JavaScript",
    css: "CSS",
    json: "JSON",
    md: "Markdown",
  };
  return labels[extension] ?? "File";
}

export function formatFileSize(value: string): string {
  const bytes = new TextEncoder().encode(value).length;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function componentIdentifier(name: string): string {
  const base = (name.split("/").at(-1) ?? "NewFile").replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[^A-Za-z0-9]/g, "");
  return /^[A-Za-z]/.test(cleaned) ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "NewFile";
}

export function starterFileContent(name: string): string {
  const extension = name.split(".").at(-1)?.toLowerCase();
  if (extension === "tsx" || extension === "jsx") {
    const component = componentIdentifier(name);
    return `export default function ${component}() {\n  return <div>${component}</div>;\n}\n`;
  }
  if (extension === "css") return `/* ${name} */\n`;
  if (extension === "json") return "{}\n";
  return "export {};\n";
}

function resolveImportPath(importer: string, specifier: string, files: FileEntry[]): string {
  const base = decodeURIComponent(
    new URL(specifier, `https://project.invalid/${importer}`).pathname.slice(1),
  );
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    `${base}/index.tsx`,
  ];
  return candidates.find((candidate) => files.some((file) => file.name === candidate)) ?? base;
}

function relativeImportPath(importer: string, target: string): string {
  const from = importer.split("/");
  from.pop();
  const to = target.split("/");
  let common = 0;
  while (common < from.length && common < to.length - 1 && from[common] === to[common]) common++;
  const parts = [...Array<string>(from.length - common).fill(".."), ...to.slice(common)];
  const relative = parts.join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export function rewriteImports(files: FileEntry[], from: string, to: string): FileEntry[] {
  return files.map((file) => {
    if (!/\.(?:tsx?|jsx?)$/i.test(file.name)) return file;
    const value = file.value.replace(
      /(["'])(\.{1,2}\/[^"']+)\1/g,
      (match, quote: string, specifier: string) => {
        if (resolveImportPath(file.name, specifier, files) !== from) return match;
        return `${quote}${relativeImportPath(file.name, to)}${quote}`;
      },
    );
    return value === file.value ? file : { ...file, value };
  });
}

export function mergeModelFiles(
  current: FileEntry[],
  changes: [string, string][],
  snapshot: FileEntry[],
): FileEntry[] {
  const next = new Map(current.map((file) => [file.name, file]));
  for (const [name, value] of changes) {
    const existing = next.get(name);
    if (existing && existing.value !== snapshot.find((file) => file.name === name)?.value) {
      continue;
    }
    next.set(name, { name, value, language: languageFromName(name) });
  }
  return [...next.values()];
}
