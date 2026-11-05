import type { FileEntry } from "../types";

export const PAGE_PATH = /^\/(?!\/)[^\\\s]*$/;

export function pathFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `/${slug}` : "";
}

export function rewriteRouteLinks(files: FileEntry[], from: string, to: string): FileEntry[] {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(["'])${escaped}\\1`, "g");
  return files.map((file) => {
    if (!/\.(?:tsx?|jsx?)$/i.test(file.name)) return file;
    const value = file.value.replace(pattern, (_match, quote: string) => `${quote}${to}${quote}`);
    return value === file.value ? file : { ...file, value };
  });
}
