import { PAGE_PATH } from "./lib/pages";
import type { FileEntry, Page } from "./types";

export type Workspace = { projects: FileEntry[][]; pages: Page[][]; active: number };

const storageKey = "playui.workspace.v1";

export function loadWorkspace(fallback: Workspace): Workspace {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.pages)) return fallback;
    if (data.projects.length === 0) {
      return data.pages.length === 0 ? { projects: [], pages: [], active: 0 } : fallback;
    }
    const projectsValid = data.projects.every(
      (files: unknown) =>
        Array.isArray(files) &&
        files.length > 0 &&
        files.every(
          (file) =>
            file &&
            typeof file.name === "string" &&
            typeof file.value === "string" &&
            typeof file.language === "string",
        ) &&
        ["App.tsx", "playui.config.json"].every((name) => files.some((file) => file.name === name)),
    );
    if (!projectsValid || data.pages.length !== data.projects.length) return fallback;
    if (
      !data.pages.every(
        (pages: unknown) =>
          Array.isArray(pages) &&
          pages.length > 0 &&
          pages.every(
            (page) =>
              page &&
              typeof page.label === "string" &&
              typeof page.path === "string" &&
              PAGE_PATH.test(page.path),
          ),
      )
    )
      return fallback;
    const active =
      Number.isInteger(data.active) && data.active >= 0 && data.active < data.projects.length
        ? data.active
        : 0;
    return { projects: data.projects, pages: data.pages, active };
  } catch {
    return fallback;
  }
}

export function saveWorkspace(workspace: Workspace) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
    return true;
  } catch {
    return false;
  }
}
