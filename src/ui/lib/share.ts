import type { FileEntry, Page } from "../types";
import { PAGE_PATH } from "./pages";

export type SharedProject = { title: string; files: FileEntry[]; pages: Page[] };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array | undefined> {
  if (typeof CompressionStream === "undefined") return undefined;
  try {
    const stream = new Blob([toArrayBuffer(bytes)])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return undefined;
  }
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeSnapshot(snapshot: SharedProject): Promise<string> {
  const bytes = textEncoder.encode(JSON.stringify(snapshot));
  const compressed = await gzip(bytes);
  return compressed ? `g${toBase64Url(compressed)}` : `j${toBase64Url(bytes)}`;
}

export async function decodeSnapshot(payload: string): Promise<SharedProject> {
  if (payload.length > 2_000_000) throw new Error("This share link is too large.");
  const kind = payload[0];
  const body = fromBase64Url(payload.slice(1));
  const bytes = kind === "g" ? await gunzip(body) : body;
  const parsed: unknown = JSON.parse(textDecoder.decode(bytes));
  if (!isRecord(parsed)) throw new Error("This share link is not valid.");
  const title =
    typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : "Prototype";
  const files = parseFiles(parsed.files);
  const pages = parsePages(parsed.pages);
  return { title, files, pages };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFiles(value: unknown): FileEntry[] {
  if (!Array.isArray(value)) throw new Error("This share link has no project files.");
  const files: FileEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (
      typeof item.name !== "string" ||
      typeof item.value !== "string" ||
      typeof item.language !== "string"
    ) {
      continue;
    }
    if (!/^[^\\/]+(?:\/[^\\/]+)*$/.test(item.name) || item.name.includes("..")) continue;
    files.push({ name: item.name, language: item.language, value: item.value });
  }
  if (!files.some((file) => file.name === "App.tsx")) {
    throw new Error("This share link has no App.tsx.");
  }
  return files;
}

function parsePages(value: unknown): Page[] {
  if (!Array.isArray(value)) throw new Error("This share link has no pages.");
  const pages = value
    .filter(isRecord)
    .map((page) => ({
      path: typeof page.path === "string" ? page.path : "",
      label: typeof page.label === "string" ? page.label.trim() : "",
    }))
    .filter((page) => page.label && PAGE_PATH.test(page.path))
    .slice(0, 50);
  if (pages.length === 0) throw new Error("This share link has no valid pages.");
  return pages;
}
