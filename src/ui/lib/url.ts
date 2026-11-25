import type { Device, Tab } from "../types";
import { PAGE_PATH } from "./pages";

export type ProjectLocation = {
  kind: "project";
  projectRef: string;
  page: string;
  tab: Tab;
  device: Device;
  file?: string;
  outlines: boolean;
  theme?: "light" | "dark";
};

export type ShareLocation = {
  kind: "share";
  payload: string;
  page: string;
  device: Device;
  theme?: "light" | "dark";
};

export type AppLocation = { kind: "home" } | ProjectLocation | ShareLocation;

function pageFrom(segments: string[]): string {
  if (segments.length === 0) return "/";
  const page = `/${segments.join("/")}`;
  return PAGE_PATH.test(page) ? page : "/";
}

function parseQuery(query: string): {
  tab: Tab;
  device: Device;
  file?: string;
  outlines: boolean;
  theme?: "light" | "dark";
} {
  const params = new URLSearchParams(query);
  const device = params.get("device");
  return {
    tab: params.get("view") === "code" ? "code" : "preview",
    device: device === "tablet" || device === "mobile" ? device : "desktop",
    file: params.get("file") ?? undefined,
    outlines: params.get("outlines") === "1",
    theme:
      params.get("theme") === "dark"
        ? ("dark" as const)
        : params.get("theme") === "light"
          ? ("light" as const)
          : undefined,
  };
}

export function parseLocation(hash = window.location.hash): AppLocation {
  const raw = hash.replace(/^#/, "");
  const [pathPart = "", query = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "p" && segments[1]) {
    const parsed = parseQuery(query);
    return {
      kind: "project",
      projectRef: segments[1],
      page: pageFrom(segments.slice(2)),
      ...parsed,
    };
  }
  if (segments[0] === "s" && segments[1]) {
    const parsed = parseQuery(query);
    return {
      kind: "share",
      payload: segments[1],
      page: pageFrom(segments.slice(2)),
      device: parsed.device,
      theme: parsed.theme,
    };
  }
  return { kind: "home" };
}

function pageSuffix(page: string): string {
  if (page === "/" || !page) return "";
  return "/" + page.slice(1).split("/").map(encodeURIComponent).join("/");
}

function queryString(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function buildProjectHash(options: {
  projectRef: string;
  page: string;
  tab: Tab;
  device: Device;
  file?: string;
  outlines: boolean;
  theme?: "light" | "dark";
}): string {
  const query = queryString({
    view: options.tab === "code" ? "code" : undefined,
    device: options.device === "desktop" ? undefined : options.device,
    file: options.tab === "code" ? options.file : undefined,
    outlines: options.outlines ? "1" : undefined,
    theme: options.theme,
  });
  return `#/p/${encodeURIComponent(options.projectRef)}${pageSuffix(options.page)}${query}`;
}

export function buildShareHash(
  payload: string,
  options: { page: string; device: Device; theme?: "light" | "dark" },
): string {
  const query = queryString({
    device: options.device === "desktop" ? undefined : options.device,
    theme: options.theme,
  });
  return `#/s/${payload}${pageSuffix(options.page)}${query}`;
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "prototype";
}

export function projectRef(title: string, id: string): string {
  return `${slugify(title)}~${id}`;
}

export function projectIdFromRef(ref: string): string {
  const separator = ref.lastIndexOf("~");
  return separator >= 0 ? ref.slice(separator + 1) : ref;
}
