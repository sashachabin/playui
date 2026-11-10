import type { Device, EditorAction, EditorResult, EditorSnapshot } from "../types";
import { writeConfig } from "./config";
import {
  PROTECTED_FILES,
  languageFromName,
  normalizeFilePath,
  rewriteImports,
  starterFileContent,
} from "./files";
import { PAGE_PATH, rewriteRouteLinks } from "./pages";

export function applyEditorActions(
  snapshot: EditorSnapshot,
  actions: EditorAction[],
): EditorResult {
  let files = snapshot.files;
  let pages = [...snapshot.pages];
  let startRoute = snapshot.startRoute;
  let afterSubmit = snapshot.afterSubmit;
  let route = snapshot.route;
  let activeFile = snapshot.activeFile;
  let tab = snapshot.tab;
  let device = snapshot.device;
  let outlines = snapshot.outlines;
  let theme: "light" | "dark" | undefined;
  let restart = false;
  let configDirty = false;
  const notes: string[] = [];
  const findPage = (path: string | undefined) => pages.find((page) => page.path === path);

  for (const action of actions.slice(0, 20)) {
    switch (action.type) {
      case "add_page": {
        const label = action.label?.trim() ?? "";
        const path = action.path?.trim() ?? "";
        if (!label || !PAGE_PATH.test(path) || findPage(path)) break;
        pages.push({ path, label });
        notes.push(`Added page “${label}” (${path})`);
        break;
      }
      case "rename_page": {
        const index = pages.findIndex((page) => page.path === action.path);
        if (index === -1) break;
        const page = pages[index]!;
        const label = action.label?.trim() || page.label;
        const nextPath = action.newPath?.trim() || page.path;
        if (!label || !PAGE_PATH.test(nextPath)) break;
        if (
          pages.some(
            (candidate, candidateIndex) => candidateIndex !== index && candidate.path === nextPath,
          )
        ) {
          break;
        }
        if (nextPath !== page.path) {
          files = rewriteRouteLinks(files, page.path, nextPath);
          if (route === page.path) route = nextPath;
          if (startRoute === page.path) {
            startRoute = nextPath;
            configDirty = true;
          }
          if (afterSubmit === page.path) {
            afterSubmit = nextPath;
            configDirty = true;
          }
        }
        pages[index] = { path: nextPath, label };
        notes.push(`Renamed “${page.label}” to ${nextPath}`);
        break;
      }
      case "delete_page": {
        const index = pages.findIndex((page) => page.path === action.path);
        if (index === -1 || pages.length <= 1) break;
        const [removed] = pages.splice(index, 1);
        if (!removed) break;
        if (startRoute === removed.path) {
          startRoute = pages[0]!.path;
          configDirty = true;
        }
        if (afterSubmit === removed.path) {
          afterSubmit = "";
          configDirty = true;
        }
        if (route === removed.path) route = startRoute;
        notes.push(`Removed page “${removed.label}”`);
        break;
      }
      case "move_page": {
        const index = pages.findIndex((page) => page.path === action.path);
        if (index === -1) break;
        const offset = action.direction === "down" ? 1 : action.direction === "up" ? -1 : 0;
        const target = index + offset;
        if (!offset || target < 0 || target >= pages.length) break;
        const [page] = pages.splice(index, 1);
        if (!page) break;
        pages.splice(target, 0, page);
        notes.push(`Moved “${page.label}” ${action.direction === "up" ? "up" : "down"}`);
        break;
      }
      case "set_start_page": {
        if (!findPage(action.path)) break;
        startRoute = action.path!;
        configDirty = true;
        notes.push(`Start page: ${action.path}`);
        break;
      }
      case "set_after_submit": {
        const path = action.path ?? "";
        if (path && !findPage(path)) break;
        afterSubmit = path;
        configDirty = true;
        notes.push(path ? `After submit: ${path}` : "Cleared the after-submit page");
        break;
      }
      case "navigate": {
        if (!findPage(action.path)) break;
        route = action.path!;
        tab = "preview";
        notes.push(`Opened ${action.path}`);
        break;
      }
      case "set_theme": {
        if (action.theme !== "light" && action.theme !== "dark") break;
        theme = action.theme;
        configDirty = true;
        notes.push(`Theme: ${theme}`);
        break;
      }
      case "set_device": {
        if (!["desktop", "tablet", "mobile"].includes(action.device ?? "")) break;
        device = action.device as Device;
        notes.push(`Preview size: ${device}`);
        break;
      }
      case "set_tab": {
        if (!["preview", "code"].includes(action.tab ?? "")) break;
        tab = action.tab as "preview" | "code";
        notes.push(tab === "code" ? "Opened Code" : "Opened Preview");
        break;
      }
      case "set_outlines": {
        if (typeof action.enabled !== "boolean") break;
        outlines = action.enabled;
        notes.push(outlines ? "Layout outlines on" : "Layout outlines off");
        break;
      }
      case "add_file": {
        const name = action.name ? normalizeFilePath(action.name) : null;
        if (!name || files.some((file) => file.name === name)) break;
        const content =
          typeof action.content === "string" && action.content.trim()
            ? action.content
            : starterFileContent(name);
        files = [...files, { name, language: languageFromName(name), value: content }];
        activeFile = name;
        tab = "code";
        notes.push(`Created ${name}`);
        break;
      }
      case "open_file": {
        if (!action.name || !files.some((file) => file.name === action.name)) break;
        activeFile = action.name;
        tab = "code";
        notes.push(`Opened ${action.name}`);
        break;
      }
      case "rename_file": {
        const name = action.name;
        const next = action.newName ? normalizeFilePath(action.newName) : null;
        if (!name || !next) break;
        if (PROTECTED_FILES.has(name) || PROTECTED_FILES.has(next)) break;
        if (!files.some((file) => file.name === name)) break;
        if (files.some((file) => file.name === next)) break;
        files = rewriteImports(files, name, next).map((file) =>
          file.name === name ? { ...file, name: next, language: languageFromName(next) } : file,
        );
        if (activeFile === name) activeFile = next;
        notes.push(`Renamed ${name} to ${next}`);
        break;
      }
      case "delete_file": {
        if (!action.name || PROTECTED_FILES.has(action.name)) break;
        if (!files.some((file) => file.name === action.name)) break;
        files = files.filter((file) => file.name !== action.name);
        if (activeFile === action.name) activeFile = "App.tsx";
        notes.push(`Deleted ${action.name}`);
        break;
      }
      case "restart_flow": {
        restart = true;
        notes.push("Restarted the flow");
        break;
      }
    }
  }

  if (restart) route = startRoute;
  if (configDirty) {
    files = writeConfig(files, {
      startRoute,
      afterSubmit,
      ...(theme ? { theme } : {}),
    });
  }

  return {
    files,
    pages,
    startRoute,
    afterSubmit,
    route,
    activeFile,
    tab,
    device,
    outlines,
    theme,
    restart,
    notes,
  };
}
