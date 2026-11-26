import { useEffect, useMemo, useRef, useState } from "react";
import type { compilePreview } from "../preview/compile";

import { type Command } from "./components/CommandPalette";
import { DEFAULT_PAGES, initialFiles, type ProjectTemplate } from "./data";
import { applyEditorActions } from "./lib/actions";
import {
  designSystemLabel,
  newProjectId,
  parseConfig,
  projectId,
  projectTitle,
  withProjectId,
  writeConfig,
} from "./lib/config";
import {
  PROTECTED_FILES,
  languageFromName,
  mergeModelFiles,
  normalizeFilePath,
  rewriteImports,
  starterFileContent,
} from "./lib/files";
import { PAGE_PATH, pathFromLabel, rewriteRouteLinks } from "./lib/pages";
import { encodeSnapshot } from "./lib/share";
import { dialogIsOpen } from "./lib/dialogs";
import {
  buildProjectHash,
  buildShareHash,
  parseLocation,
  projectIdFromRef,
  projectRef,
} from "./lib/url";
import type { Device, EditorAction, FileEntry, Message, Page, Tab } from "./types";
import { getUiKit, isKonturUi } from "./ui-kit";
import { loadWorkspace, saveWorkspace } from "./workspace";

const AI_TIMEOUT_MS = 240_000;
const EMPTY_FILES: FileEntry[] = [];
const EMPTY_PAGES: Page[] = [];
const HISTORY_LIMIT = 50;
const UI = getUiKit();
const KONTUR = isKonturUi();

type ProjectSnapshot = { files: FileEntry[]; pages: Page[]; route: string };

type ProjectViewState = {
  activeFile: string;
  device: Device;
  route: string;
  dark: boolean | undefined;
  tab: Tab;
  outlines: boolean;
  prompt: string;
};

export function App() {
  const [workspace] = useState(() => {
    const loaded = loadWorkspace({
      projects: [initialFiles],
      pages: [DEFAULT_PAGES],
      active: 0,
    });
    return { ...loaded, projects: loaded.projects.map(withProjectId) };
  });
  const [initialLocation] = useState(() => parseLocation());
  const urlProject =
    initialLocation.kind === "project"
      ? workspace.projects.findIndex(
          (projectFiles) =>
            projectId(projectFiles) === projectIdFromRef(initialLocation.projectRef),
        )
      : -1;
  const initialProject = urlProject >= 0 ? urlProject : workspace.active;
  const initialProjectFiles = workspace.projects[initialProject] ?? EMPTY_FILES;
  const initialPages = workspace.pages[initialProject] ?? EMPTY_PAGES;
  const initialConfig = parseConfig(initialProjectFiles);
  const configuredStart =
    typeof initialConfig?.startRoute === "string" ? initialConfig.startRoute : undefined;
  const initialStart =
    configuredStart && initialPages.some((page) => page.path === configuredStart)
      ? configuredStart
      : (initialPages[0]?.path ?? "/");
  const initialFileList = initialProjectFiles;
  const initialRoute =
    initialLocation.kind === "project" && PAGE_PATH.test(initialLocation.page)
      ? initialLocation.page
      : initialStart;
  const initialFile =
    initialLocation.kind === "project" &&
    initialLocation.file &&
    initialFileList.some((file) => file.name === initialLocation.file)
      ? initialLocation.file
      : "App.tsx";
  const [projects, setProjects] = useState(workspace.projects);
  const [project, setProject] = useState(initialProject);
  const [openProjects, setOpenProjects] = useState(
    workspace.projects.length > 0 ? [initialProject] : [],
  );
  const [view, setView] = useState<"home" | "workspace">(
    initialLocation.kind === "project" && urlProject >= 0 && workspace.projects.length > 0
      ? "workspace"
      : "home",
  );
  const [projectPages, setProjectPages] = useState<Page[][]>(workspace.pages);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStorageError(!saveWorkspace({ projects, pages: projectPages, active: project }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [projects, projectPages, project]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import("./CodeEditor");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const activeProjectFiles = projects[project];
  const files = activeProjectFiles ?? EMPTY_FILES;
  const pages = projectPages[project] ?? EMPTY_PAGES;
  const filesRef = useRef(files);
  const pagesRef = useRef(pages);
  filesRef.current = files;
  pagesRef.current = pages;

  const historyKey = `${project}:${projectId(files) ?? "none"}`;
  const snapshotRef = useRef<ProjectSnapshot>({ files, pages, route: initialRoute });
  const projectHistory = useRef<{ past: ProjectSnapshot[]; future: ProjectSnapshot[] }>({
    past: [],
    future: [],
  });
  const lastCommitted = useRef<ProjectSnapshot | null>(null);
  const historyProject = useRef<string | null>(null);
  const applyingHistory = useRef(false);
  const [, bumpHistory] = useState(0);

  function setFiles(update: (current: FileEntry[]) => FileEntry[]) {
    setProjects((current) =>
      current.map((projectFiles, index) =>
        index === project ? update(projectFiles) : projectFiles,
      ),
    );
  }
  function setPages(update: (current: Page[]) => Page[]) {
    setProjectPages((current) =>
      current.map((currentPages, index) =>
        index === project ? update(currentPages) : currentPages,
      ),
    );
  }

  useEffect(() => {
    if (!activeProjectFiles) {
      projectHistory.current = { past: [], future: [] };
      lastCommitted.current = null;
      historyProject.current = null;
      return;
    }
    if (historyProject.current !== historyKey) {
      historyProject.current = historyKey;
      projectHistory.current = { past: [], future: [] };
      lastCommitted.current = snapshotRef.current;
      bumpHistory((value) => value + 1);
      return;
    }
    if (applyingHistory.current) {
      applyingHistory.current = false;
      lastCommitted.current = snapshotRef.current;
      return;
    }
    const timeout = window.setTimeout(() => {
      const current = snapshotRef.current;
      const previous = lastCommitted.current;
      if (!previous || (previous.files === current.files && previous.pages === current.pages)) {
        return;
      }
      projectHistory.current.past.push(previous);
      if (projectHistory.current.past.length > HISTORY_LIMIT) projectHistory.current.past.shift();
      projectHistory.current.future = [];
      lastCommitted.current = current;
      bumpHistory((value) => value + 1);
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [activeProjectFiles, historyKey, pages]);

  function applySnapshot(snapshot: ProjectSnapshot) {
    applyingHistory.current = true;
    lastCommitted.current = snapshot;
    setFiles(() => snapshot.files);
    setPages(() => snapshot.pages);
    const nextRoute = snapshot.pages.some((page) => page.path === snapshot.route)
      ? snapshot.route
      : (snapshot.pages[0]?.path ?? "/");
    navigateRoute(nextRoute, "replace");
    bumpHistory((value) => value + 1);
  }

  function undoProject() {
    if (!activeProjectFiles || busy) return;
    const current = snapshotRef.current;
    const history = projectHistory.current;
    const committed = lastCommitted.current;
    if (committed && (committed.files !== current.files || committed.pages !== current.pages)) {
      history.future.push(current);
      applySnapshot(committed);
      return;
    }
    const previous = history.past.pop();
    if (!previous) return;
    history.future.push(current);
    applySnapshot(previous);
  }

  function redoProject() {
    if (!activeProjectFiles || busy) return;
    const next = projectHistory.current.future.pop();
    if (!next) return;
    projectHistory.current.past.push(snapshotRef.current);
    if (projectHistory.current.past.length > HISTORY_LIMIT) projectHistory.current.past.shift();
    applySnapshot(next);
  }

  const [activeFile, setActiveFile] = useState(initialFile);
  const [device, setDevice] = useState<Device>(
    initialLocation.kind === "project" ? initialLocation.device : "desktop",
  );
  const [revision, setRevision] = useState(0);
  const [route, setRoute] = useState(initialRoute);
  const routeRef = useRef(initialRoute);
  routeRef.current = route;
  snapshotRef.current = { files, pages, route };
  const routeHistory = useRef({ entries: [initialRoute], index: 0 });
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [dark, setDark] = useState<boolean | undefined>(
    initialLocation.kind === "project" && initialLocation.theme
      ? initialLocation.theme === "dark"
      : undefined,
  );
  const [tab, setTab] = useState<Tab>(
    initialLocation.kind === "project" ? initialLocation.tab : "preview",
  );
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  const pendingGeneration = useRef<string | null>(null);
  const [outlines, setOutlines] = useState(
    initialLocation.kind === "project" ? initialLocation.outlines : false,
  );
  const [projectMessages, setProjectMessages] = useState<Record<number, Message[]>>({});
  const messages = projectMessages[project] ?? [];
  function setMessages(update: (current: Message[]) => Message[]) {
    setProjectMessages((current) => ({ ...current, [project]: update(current[project] ?? []) }));
  }

  const [filesOpen, setFilesOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [fileSettingsName, setFileSettingsName] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (document.querySelector(".k-palette-modal")) {
        event.preventDefault();
        setPaletteOpen(false);
        return;
      }
      if (dialogIsOpen()) return;
      event.preventDefault();
      setPaletteOpen((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (dialogIsOpen()) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (
        view === "workspace" &&
        modifier &&
        (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        if (event.key.toLowerCase() === "y" || event.shiftKey) redoProject();
        else undoProject();
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "n") {
        setNewProjectOpen(true);
        return;
      }
      if (view !== "workspace") return;
      if (event.key.toLowerCase() === "v") setTab("preview");
      if (event.key.toLowerCase() === "c") setTab("code");
      if (event.key.toLowerCase() === "r") {
        setRuntimeError("");
        setRevision((value) => value + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, busy, activeProjectFiles, pages]);

  useEffect(() => {
    if (shareState === "idle") return;
    const timer = window.setTimeout(() => setShareState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [shareState]);

  const config = parseConfig(files);
  const locale = typeof config?.locale === "string" ? config.locale : "en-US";
  const startRoute =
    typeof config?.startRoute === "string" && pages.some((page) => page.path === config.startRoute)
      ? config.startRoute
      : (pages[0]?.path ?? "/");
  const afterSubmit =
    typeof config?.afterSubmit === "string" &&
    pages.some((page) => page.path === config.afterSubmit)
      ? config.afterSubmit
      : "";

  const projectViews = useRef<Record<number, ProjectViewState>>({});
  const skipSaveView = useRef(false);

  const [compiled, setCompiled] = useState<{
    bundle: Awaited<ReturnType<typeof compilePreview>>;
    document: typeof import("../preview/compile").previewDocument;
    files: FileEntry[];
  }>();
  const [buildError, setBuildError] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!activeProjectFiles) {
      setCompiled(undefined);
      setBuildError("");
      setRuntimeError("");
      return;
    }
    let stale = false;
    const timeout = window.setTimeout(async () => {
      try {
        const runtime = await import("../preview/compile");
        const bundle = await runtime.compilePreview(
          Object.fromEntries(files.map((file) => [file.name, file.value])),
        );
        if (stale) return;
        setCompiled({ bundle, document: runtime.previewDocument, files });
        setBuildError("");
        setRuntimeError("");
      } catch (error) {
        if (!stale) setBuildError(error instanceof Error ? error.message : String(error));
      }
    }, 160);
    return () => {
      stale = true;
      window.clearTimeout(timeout);
    };
  }, [activeProjectFiles, files, view]);

  useEffect(() => {
    if (!activeProjectFiles && view !== "home") setView("home");
  }, [activeProjectFiles, view]);

  const theme = config?.theme === "dark" ? "dark" : "light";
  const isDark = dark ?? theme === "dark";

  const currentRef = projectRef(projectTitle(files, project), projectId(files) ?? `p${project}`);

  useEffect(() => {
    if (view !== "workspace") {
      if (window.location.hash !== "#/" && window.location.hash !== "") {
        history.replaceState(null, "", "#/");
      }
      return;
    }
    const hash = buildProjectHash({
      projectRef: currentRef,
      page: route,
      tab,
      device,
      file: activeFile,
      outlines,
      theme: isDark ? "dark" : "light",
    });
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }, [view, currentRef, route, tab, device, activeFile, outlines, isDark]);

  useEffect(() => {
    function reload() {
      window.location.reload();
    }
    window.addEventListener("hashchange", reload);
    return () => window.removeEventListener("hashchange", reload);
  }, []);
  const preview = useMemo(
    () =>
      compiled && compiled.files === files
        ? compiled.document(compiled.bundle, {
            route,
            dark: isDark,
            locale,
            outlines,
            afterSubmit,
          })
        : "",
    [compiled, files, route, isDark, locale, outlines, afterSubmit],
  );

  useEffect(() => {
    function navigate(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const path: unknown = event.data?.route;
      if (typeof path === "string" && PAGE_PATH.test(path)) navigateRoute(path);
      if (typeof event.data?.error === "string") setRuntimeError(event.data.error);
    }
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  }, []);

  function syncHistoryFlags() {
    const history = routeHistory.current;
    setCanGoBack(history.index > 0);
    setCanGoForward(history.index < history.entries.length - 1);
  }

  function navigateRoute(path: string, mode: "push" | "replace" | "reset" = "push") {
    if (!PAGE_PATH.test(path)) return false;
    const history = routeHistory.current;
    if (mode === "reset") {
      history.entries = [path];
      history.index = 0;
    } else if (mode === "replace") {
      history.entries[history.index] = path;
    } else if (path !== routeRef.current) {
      history.entries = history.entries.slice(0, history.index + 1);
      history.entries.push(path);
      history.index = history.entries.length - 1;
    }
    routeRef.current = path;
    setRoute(path);
    syncHistoryFlags();
    return true;
  }

  function replaceHistoryPath(from: string, to: string) {
    const history = routeHistory.current;
    history.entries = history.entries.map((entry) => (entry === from ? to : entry));
    if (routeRef.current === from) {
      routeRef.current = to;
      setRoute(to);
    }
    syncHistoryFlags();
  }

  function goBack() {
    const history = routeHistory.current;
    if (history.index <= 0) return;
    history.index -= 1;
    const path = history.entries[history.index]!;
    routeRef.current = path;
    setRoute(path);
    syncHistoryFlags();
  }

  function goForward() {
    const history = routeHistory.current;
    if (history.index >= history.entries.length - 1) return;
    history.index += 1;
    const path = history.entries[history.index]!;
    routeRef.current = path;
    setRoute(path);
    syncHistoryFlags();
  }

  function saveProjectView() {
    if (view !== "workspace") return;
    projectViews.current[project] = { activeFile, device, route, dark, tab, outlines, prompt };
  }

  function goHome() {
    if (view === "workspace") saveProjectView();
    setView("home");
  }

  function openProject(index: number, projectFiles: FileEntry[]) {
    if (index === project && view === "workspace") return;
    if (!skipSaveView.current) saveProjectView();
    skipSaveView.current = false;
    setOpenProjects((current) => (current.includes(index) ? current : [...current, index]));
    setView("workspace");
    const projectPageList = projectPages[index] ?? DEFAULT_PAGES;
    let start = projectPageList[0]?.path ?? "/";
    try {
      const parsed = JSON.parse(
        projectFiles.find((file) => file.name === "playui.config.json")?.value ?? "{}",
      );
      if (projectPageList.some((page) => page.path === parsed?.startRoute)) {
        start = parsed.startRoute;
      }
    } catch {
      // Ignore an unfinished config and fall back to the first page.
    }
    const stored = projectViews.current[index];
    const targetFiles = projects[index] ?? projectFiles;
    const storedFile = stored?.activeFile;
    const nextRoute = stored?.route;
    setBuildError("");
    setRuntimeError("");
    setProject(index);
    setActiveFile(
      storedFile && targetFiles.some((file) => file.name === storedFile) ? storedFile : "App.tsx",
    );
    navigateRoute(
      nextRoute && projectPageList.some((page) => page.path === nextRoute) ? nextRoute : start,
      "reset",
    );
    setDark(stored?.dark);
    setDevice(stored?.device ?? device);
    setOutlines(stored?.outlines ?? outlines);
    setPrompt(stored?.prompt ?? "");
    setTab(stored?.tab ?? "preview");
    setFilesOpen(false);
    setNewFileOpen(false);
    setFileSettingsName(null);
    setNewProjectOpen(false);
    setRevision((value) => value + 1);
  }

  function closeProject(index: number) {
    const position = openProjects.indexOf(index);
    const remaining = openProjects.filter((candidate) => candidate !== index);
    if (index === project) saveProjectView();
    delete projectViews.current[index];
    setOpenProjects(remaining);
    if (index !== project) return;
    if (remaining.length === 0) {
      setView("home");
      return;
    }
    skipSaveView.current = true;
    const next = remaining[Math.min(position, remaining.length - 1)]!;
    openProject(next, projects[next]!);
  }

  function closeOtherProjects(index: number) {
    for (const candidate of openProjects) {
      if (candidate !== index) delete projectViews.current[candidate];
    }
    setOpenProjects([index]);
    if (index !== project) {
      skipSaveView.current = true;
      openProject(index, projects[index]!);
    }
  }

  function closeProjectsToRight(index: number) {
    const position = openProjects.indexOf(index);
    if (position < 0) return;
    const remaining = openProjects.slice(0, position + 1);
    for (const candidate of openProjects.slice(position + 1)) {
      delete projectViews.current[candidate];
    }
    setOpenProjects(remaining);
    if (!remaining.includes(project)) {
      skipSaveView.current = true;
      openProject(index, projects[index]!);
    }
  }

  function reorderOpenTabs(next: number[]) {
    if (next.length === openProjects.length) setOpenProjects(next);
  }

  function renameProject(index: number, name: string) {
    setProjects((current) =>
      current.map((projectFiles, projectIndex) =>
        projectIndex === index ? writeConfig(projectFiles, { name }) : projectFiles,
      ),
    );
  }

  function reorderProjectCards(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= projects.length) return;
    const order = projects.map((_, index) => index);
    const [moved] = order.splice(from, 1);
    if (moved === undefined) return;
    order.splice(Math.min(to, order.length), 0, moved);
    const indexMap = new Map<number, number>();
    order.forEach((oldIndex, newIndex) => indexMap.set(oldIndex, newIndex));

    setProjects(order.map((index) => projects[index]!));
    setProjectPages(order.map((index) => projectPages[index] ?? DEFAULT_PAGES));
    setProject(indexMap.get(project) ?? 0);
    setOpenProjects((current) =>
      current
        .map((index) => indexMap.get(index))
        .filter((index): index is number => index !== undefined),
    );

    const views: Record<number, ProjectViewState> = {};
    for (const [key, value] of Object.entries(projectViews.current)) {
      const mapped = indexMap.get(Number(key));
      if (mapped !== undefined) views[mapped] = value;
    }
    projectViews.current = views;

    setProjectMessages((current) => {
      const next: Record<number, Message[]> = {};
      for (const [key, value] of Object.entries(current)) {
        const mapped = indexMap.get(Number(key));
        if (mapped !== undefined) next[mapped] = value;
      }
      return next;
    });
  }

  function duplicateProject(index: number) {
    const source = projects[index];
    if (!source) return;
    const name = `${projectTitle(source, index)} copy`;
    const files = writeConfig(
      source.map((file) => ({ ...file })),
      { id: newProjectId(), name },
    );
    const pages = (projectPages[index] ?? DEFAULT_PAGES).map((page) => ({ ...page }));
    setProjects((current) => [...current, files]);
    setProjectPages((current) => [...current, pages]);
  }

  function deleteProjects(indices: number[]) {
    const remove = new Set(indices);
    if (remove.size === 0) return;
    const removingAll = remove.size >= projects.length;

    const nextProjects: FileEntry[][] = [];
    const nextPages: Page[][] = [];
    const indexMap = new Map<number, number>();
    for (let index = 0; index < projects.length; index += 1) {
      if (remove.has(index)) continue;
      indexMap.set(index, nextProjects.length);
      nextProjects.push(projects[index]!);
      nextPages.push(projectPages[index] ?? DEFAULT_PAGES);
    }

    let nextProject = indexMap.get(project) ?? 0;
    if (remove.has(project)) {
      let nearest = -1;
      for (let index = project - 1; index >= 0; index -= 1) {
        if (!remove.has(index)) {
          nearest = index;
          break;
        }
      }
      if (nearest < 0) {
        for (let index = project + 1; index < projects.length; index += 1) {
          if (!remove.has(index)) {
            nearest = index;
            break;
          }
        }
      }
      nextProject = nearest >= 0 ? (indexMap.get(nearest) ?? 0) : 0;
    }

    setProjects(nextProjects);
    setProjectPages(nextPages);
    setProject(nextProject);
    if (removingAll) {
      setView("home");
      setCompiled(undefined);
      setBuildError("");
      setRuntimeError("");
    }
    setOpenProjects((current) =>
      current
        .filter((index) => !remove.has(index))
        .map((index) => indexMap.get(index))
        .filter((index): index is number => index !== undefined),
    );

    const views: Record<number, ProjectViewState> = {};
    for (const [key, value] of Object.entries(projectViews.current)) {
      const index = Number(key);
      if (remove.has(index)) continue;
      const mapped = indexMap.get(index);
      if (mapped !== undefined) views[mapped] = value;
    }
    projectViews.current = views;

    setProjectMessages((current) => {
      const next: Record<number, Message[]> = {};
      for (const [key, value] of Object.entries(current)) {
        const index = Number(key);
        if (remove.has(index)) continue;
        const mapped = indexMap.get(index);
        if (mapped !== undefined) next[mapped] = value;
      }
      return next;
    });
  }

  function reorderPages(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= pages.length) return;
    setPages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(Math.min(to, next.length), 0, moved);
      return next;
    });
  }

  function duplicatePage(path: string) {
    const index = pages.findIndex((page) => page.path === path);
    const source = pages[index];
    if (!source) return;
    const label = `${source.label} copy`;
    let nextPath = pathFromLabel(label) || `${source.path}-copy`;
    let suffix = 2;
    while (pages.some((page) => page.path === nextPath)) {
      nextPath = `${pathFromLabel(label) || `${source.path}-copy`}-${suffix}`;
      suffix += 1;
    }
    const page = { path: nextPath, label };
    setPages((current) => [...current.slice(0, index + 1), page, ...current.slice(index + 1)]);
    navigateRoute(nextPath);
    setTab("preview");
  }

  function selectPage(path: string) {
    navigateRoute(path);
    setTab("preview");
  }

  function addPage() {
    const labels = new Set(pages.map((page) => page.label.toLowerCase()));
    const paths = new Set(pages.map((page) => page.path));
    let number = 1;
    let label = `Page ${number}`;
    let path = pathFromLabel(label);
    while (labels.has(label.toLowerCase()) || paths.has(path)) {
      number += 1;
      label = `Page ${number}`;
      path = pathFromLabel(label);
    }
    const page = { path, label };
    setPages((current) => [...current, page]);
    navigateRoute(path);
    setTab("preview");
    return page;
  }

  function renamePage(path: string, label: string) {
    const name = label.trim();
    if (!name) return;
    let nextPath = path;
    if (/^\/page-\d+$/.test(path)) {
      const base = pathFromLabel(name) || path;
      nextPath = base;
      let suffix = 2;
      while (pages.some((page) => page.path !== path && page.path === nextPath)) {
        nextPath = `${base}-${suffix}`;
        suffix += 1;
      }
    }
    setPages((current) =>
      current.map((page) => (page.path === path ? { ...page, label: name, path: nextPath } : page)),
    );
    if (nextPath === path) return;
    setFiles((current) => rewriteRouteLinks(current, path, nextPath));
    replaceHistoryPath(path, nextPath);
    const changes: Record<string, unknown> = {};
    if (startRoute === path) changes.startRoute = nextPath;
    if (afterSubmit === path) changes.afterSubmit = nextPath;
    if (Object.keys(changes).length > 0) {
      setFiles((current) => writeConfig(current, changes));
    }
  }

  function deletePage(path: string) {
    if (pages.length <= 1) return;
    const remaining = pages.filter((page) => page.path !== path);
    setPages(() => remaining);
    replaceHistoryPath(path, remaining[0]!.path);
    const changes: Record<string, unknown> = {};
    if (startRoute === path) changes.startRoute = remaining[0]!.path;
    if (afterSubmit === path) changes.afterSubmit = "";
    if (Object.keys(changes).length > 0) setFiles((current) => writeConfig(current, changes));
  }

  function setStartPage(path: string) {
    setFiles((current) => writeConfig(current, { startRoute: path }));
  }

  function updateFile(value: string | undefined) {
    setFiles((current) =>
      current.map((file) => (file.name === activeFile ? { ...file, value: value ?? "" } : file)),
    );
  }

  function reloadPreview() {
    setRuntimeError("");
    setRevision((value) => value + 1);
  }

  function toggleTheme() {
    setDark((current) => !(current ?? isDark));
  }

  function createProject(template: ProjectTemplate) {
    const draft = initialFiles.map((file) => {
      if (file.name === "App.tsx") return { ...file, value: template.appSource };
      if (file.name !== "playui.config.json") return file;
      const base = JSON.parse(file.value);
      return {
        ...file,
        value: JSON.stringify(
          {
            ...base,
            id: newProjectId(),
            name: template.name,
            designSystem: template.system,
            packages: template.packages,
            startRoute: template.route,
            afterSubmit: "/done",
          },
          null,
          2,
        ),
      };
    });
    setProjects((current) => [...current, draft]);
    setProjectPages((current) => [...current, DEFAULT_PAGES]);
    openProject(projects.length, draft);
  }

  function generateProject(request: string) {
    const clean = request.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const name = clean.length > 54 ? `${clean.slice(0, 53).trimEnd()}…` : clean;
    const draft = initialFiles.map((file) => {
      if (file.name !== "playui.config.json") return { ...file };
      try {
        const base = JSON.parse(file.value);
        return {
          ...file,
          value: JSON.stringify(
            {
              ...base,
              id: newProjectId(),
              name,
              startRoute: "/",
            },
            null,
            2,
          ),
        };
      } catch {
        return { ...file };
      }
    });
    pendingGeneration.current = clean;
    setProjects((current) => [...current, draft]);
    setProjectPages((current) => [...current, DEFAULT_PAGES]);
    openProject(projects.length, draft);
    setNewProjectOpen(false);
  }

  async function shareProject(): Promise<boolean> {
    if (shareState === "copying") return false;
    setShareState("copying");
    try {
      const payload = await encodeSnapshot({ title: projectTitle(files, project), files, pages });
      const url = new URL(window.location.href);
      url.hash = buildShareHash(payload, {
        page: route,
        device,
        theme: isDark ? "dark" : "light",
      });
      const text = url.toString();
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          setShareState("copied");
          return true;
        } catch {
          // Fall back to a selection copy outside secure contexts.
        }
      }
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) throw new Error("Clipboard unavailable");
      setShareState("copied");
      return true;
    } catch {
      setShareState("error");
      return false;
    }
  }

  async function generate(submittedPrompt: string) {
    if (!submittedPrompt || busy) return;
    stopped.current = false;
    setMessages((current) => [...current, { role: "user", text: submittedPrompt }]);
    setPrompt("");
    setBusy(true);
    const controller = new AbortController();
    generation.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(import.meta.env.VITE_AI_API_URL || "/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: submittedPrompt,
          files: Object.fromEntries(files.map((file) => [file.name, file.value])),
          pages: pages.map(({ path, label }) => ({ path, label })),
          context: { route, theme: isDark ? "dark" : "light", device, tab },
        }),
      });
      const raw = await response.text();
      let result: {
        text?: string;
        error?: string;
        files?: Record<string, string>;
        actions?: EditorAction[];
      };
      try {
        result = raw ? (JSON.parse(raw) as typeof result) : {};
      } catch {
        throw new Error(
          response.ok
            ? "The AI server returned an unexpected response."
            : `The AI server did not respond correctly (${response.status}). Is it running?`,
        );
      }
      if (!response.ok) throw new Error(result.error ?? "AI request failed");
      const changes = Object.entries(result.files ?? {}).filter(
        ([name, value]) => normalizeFilePath(name) === name && typeof value === "string",
      );
      const actions = Array.isArray(result.actions)
        ? result.actions.filter(
            (action): action is EditorAction => typeof action?.type === "string",
          )
        : [];
      const mergedFiles = withProjectId(mergeModelFiles(filesRef.current, changes, files));
      const applied = applyEditorActions(
        {
          files: mergedFiles,
          pages: pagesRef.current,
          startRoute,
          afterSubmit,
          route,
          activeFile,
          tab,
          device,
          outlines,
        },
        actions,
      );
      setFiles(() => applied.files);
      setPages(() => applied.pages);
      navigateRoute(applied.route);
      setActiveFile(applied.activeFile);
      setTab(applied.tab);
      setDevice(applied.device);
      setOutlines(applied.outlines);
      if (applied.theme) setDark(undefined);
      if (applied.restart) setRevision((value) => value + 1);
      const notes = applied.notes.length
        ? `\n\n${applied.notes.map((note) => `· ${note}`).join("\n")}`
        : "";
      setMessages((current) => [
        ...current,
        { role: "assistant", text: `${result.text ?? "Updated prototype."}${notes}` },
      ]);
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      const message = aborted
        ? stopped.current
          ? "Generation stopped."
          : "The request timed out. Try a smaller change or retry."
        : error instanceof Error
          ? error.message
          : "AI request failed";
      setMessages((current) => [...current, { role: "error", text: message }]);
      setPrompt((current) => current || submittedPrompt);
    } finally {
      window.clearTimeout(timeout);
      if (generation.current === controller) generation.current = null;
      setBusy(false);
    }
  }

  function sendPrompt(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || busy) return;
    void generate(prompt.trim());
  }

  useEffect(() => {
    const next = pendingGeneration.current;
    if (!next || view !== "workspace" || !activeProjectFiles || busy) return;
    pendingGeneration.current = null;
    void generate(next);
  }, [view, activeProjectFiles, busy]);

  function stopGeneration() {
    stopped.current = true;
    generation.current?.abort();
  }

  function openFile(name: string) {
    setActiveFile(name);
    setTab("code");
    setFilesOpen(false);
  }

  function createFile(name: string) {
    setFiles((current) => [
      ...current,
      { name, language: languageFromName(name), value: starterFileContent(name) },
    ]);
    setActiveFile(name);
    setTab("code");
    setNewFileOpen(false);
  }

  function saveFileSettings(nextName: string) {
    if (!fileSettingsName) return;
    const original = fileSettingsName;
    setFiles((current) => {
      const withImports = rewriteImports(current, original, nextName);
      return withImports.map((file) =>
        file.name === original
          ? { ...file, name: nextName, language: languageFromName(nextName) }
          : file,
      );
    });
    if (activeFile === original) setActiveFile(nextName);
    setFileSettingsName(null);
  }

  function deleteFile() {
    if (!fileSettingsName || PROTECTED_FILES.has(fileSettingsName)) return;
    const name = fileSettingsName;
    setFiles((current) => current.filter((file) => file.name !== name));
    if (activeFile === name) setActiveFile("App.tsx");
    setFileSettingsName(null);
  }

  const fileSettingsFile = fileSettingsName
    ? files.find((file) => file.name === fileSettingsName)
    : undefined;
  const activeScreen = pages.find((page) => page.path === route);
  const screenLabel = activeScreen?.label ?? "Custom screen";
  const projectPath = `file:///prototype/draft-${project}`;
  const declarations = useMemo(() => files.filter(({ name }) => name.endsWith(".d.ts")), [files]);

  const dirtyHistory =
    !!lastCommitted.current &&
    !!activeProjectFiles &&
    (lastCommitted.current.files !== files || lastCommitted.current.pages !== pages);
  const canUndo =
    !!activeProjectFiles && !busy && (dirtyHistory || projectHistory.current.past.length > 0);
  const canRedo = !!activeProjectFiles && !busy && projectHistory.current.future.length > 0;

  const commands: Command[] = [];
  if (view === "workspace") {
    commands.push(
      { id: "projects", label: "Go to projects", group: "Navigate", run: goHome },
      {
        id: "preview",
        label: "Show preview",
        group: "View",
        hint: "Preview",
        run: () => setTab("preview"),
      },
      {
        id: "code",
        label: "Open code",
        group: "View",
        hint: "Code",
        run: () => setTab("code"),
      },
      {
        id: "theme",
        label: "Toggle preview theme",
        group: "View",
        hint: isDark ? "Light" : "Dark",
        run: toggleTheme,
      },
      { id: "reload", label: "Reload preview", group: "View", run: reloadPreview },
    );
    if (canUndo) {
      commands.push({
        id: "undo",
        label: "Undo",
        group: "Edit",
        hint: "⌘Z",
        run: undoProject,
      });
    }
    if (canRedo) {
      commands.push({
        id: "redo",
        label: "Redo",
        group: "Edit",
        hint: "⇧⌘Z",
        run: redoProject,
      });
    }
    for (const [value, label] of [
      ["desktop", "Desktop"],
      ["tablet", "Tablet"],
      ["mobile", "Mobile"],
    ] as const) {
      commands.push({
        id: `device-${value}`,
        label: `Use ${label.toLowerCase()} preview`,
        group: "View",
        hint: device === value ? "Active" : undefined,
        run: () => setDevice(value),
      });
    }
    for (const page of pages) {
      commands.push({
        id: `page-${page.path}`,
        label: page.label,
        group: "Pages",
        hint: page.path,
        keywords: "page screen navigate",
        run: () => selectPage(page.path),
      });
    }
    for (const file of files) {
      commands.push({
        id: `file-${file.name}`,
        label: file.name,
        group: "Files",
        hint: "Open in code",
        keywords: "file code edit",
        run: () => openFile(file.name),
      });
    }
    for (const index of openProjects) {
      commands.push({
        id: `tab-${index}`,
        label: projectTitle(projects[index] ?? [], index),
        group: "Open tabs",
        hint: index === project ? "Active tab" : "Switch tab",
        keywords: "project tab switch",
        run: () => openProject(index, projects[index]!),
      });
    }
    commands.push(
      { id: "new-page", label: "New page", group: "Create", run: addPage },
      { id: "new-file", label: "New file", group: "Create", run: () => setNewFileOpen(true) },
      {
        id: "new-project",
        label: "New prototype",
        group: "Create",
        run: () => setNewProjectOpen(true),
      },
      { id: "share", label: "Copy prototype link", group: "Share", run: () => void shareProject() },
    );
  } else {
    for (const [index, projectFiles] of projects.entries()) {
      const config = parseConfig(projectFiles);
      commands.push({
        id: `project-${index}`,
        label: projectTitle(projectFiles, index),
        group: "Projects",
        hint: designSystemLabel(config?.designSystem),
        keywords: "open project prototype",
        run: () => openProject(index, projects[index]!),
      });
    }
    commands.push({
      id: "new-project",
      label: "New prototype",
      group: "Create",
      run: () => setNewProjectOpen(true),
    });
  }

  commands.push({
    id: "shortcuts",
    label: "Keyboard shortcuts",
    group: "Help",
    hint: "?",
    run: () => setShortcutsOpen(true),
  });

  if (view === "home" || !activeProjectFiles) {
    return (
      <>
        <UI.HomeScreen
          projects={projects}
          pages={projectPages}
          activeProject={project}
          onOpenProject={(index) => openProject(index, projects[index]!)}
          onNewProject={() => setNewProjectOpen(true)}
          onSearch={() => setPaletteOpen(true)}
          onRenameProject={renameProject}
          onDuplicateProject={duplicateProject}
          onDeleteProjects={deleteProjects}
          onReorderProjects={reorderProjectCards}
          onGenerateProject={generateProject}
        />
        {newProjectOpen && (
          <UI.NewPrototypeDialog
            onClose={() => setNewProjectOpen(false)}
            onCreate={(template) => {
              createProject(template);
              setNewProjectOpen(false);
            }}
          />
        )}
        {paletteOpen && (
          <UI.CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />
        )}
        {shortcutsOpen && <UI.ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      </>
    );
  }

  return (
    <main className={`app ${KONTUR ? "ui-kontur" : ""}`}>
      <UI.Header
        projects={projects}
        openProjects={openProjects}
        project={project}
        busy={busy}
        tab={tab}
        onHome={goHome}
        onOpenProject={(index) => openProject(index, projects[index]!)}
        onCloseProject={closeProject}
        onCloseOtherProjects={closeOtherProjects}
        onCloseProjectsToRight={closeProjectsToRight}
        onReorderProjects={reorderOpenTabs}
        onRenameProject={renameProject}
        onNewProject={() => setNewProjectOpen(true)}
        onSearch={() => setPaletteOpen(true)}
        onSelectTab={setTab}
        onShare={() => void shareProject()}
        shareState={shareState}
      />

      {storageError && (
        <div className="storage-warning" role="alert">
          Browser storage is full or unavailable. Keep this tab open to preserve your edits.
        </div>
      )}

      <div className={`app-body ${tab === "code" ? "is-coding" : "is-previewing"}`}>
        <UI.ProjectSidebar
          pages={pages}
          route={route}
          startRoute={startRoute}
          files={files}
          activeFile={activeFile}
          showFiles={tab === "code"}
          busy={busy}
          onSelectPage={selectPage}
          onAddPage={addPage}
          onRenamePage={renamePage}
          onDuplicatePage={duplicatePage}
          onReorderPages={reorderPages}
          onDeletePage={deletePage}
          onSetStartPage={setStartPage}
          onOpenFile={openFile}
          onNewFile={() => setNewFileOpen(true)}
          onOpenFiles={() => setFilesOpen(true)}
        />

        <section className="workspace">
          {tab === "preview" && (
            <UI.PreviewCanvas
              preview={preview ?? ""}
              device={device}
              isDark={isDark}
              route={route}
              screenLabel={screenLabel}
              buildError={buildError}
              runtimeError={runtimeError}
              revision={revision}
              frameRef={frame}
              onDevice={setDevice}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={goBack}
              onForward={goForward}
              onNavigate={navigateRoute}
              onCopyLink={shareProject}
              onUndo={undoProject}
              onRedo={redoProject}
              canUndo={canUndo}
              canRedo={canRedo}
              onToggleTheme={toggleTheme}
              routes={pages}
              onReload={reloadPreview}
              onDismissErrors={() => {
                setBuildError("");
                setRuntimeError("");
              }}
            />
          )}
          <div className={`editor-host ${tab === "code" ? "" : "is-background"}`}>
            <UI.EditorPane
              files={files}
              activeFile={activeFile}
              projectPath={projectPath}
              declarations={declarations}
              onFileChange={updateFile}
              onOpenFiles={() => setFilesOpen(true)}
              onOpenSettings={() => setFileSettingsName(activeFile)}
            />
          </div>
        </section>

        <UI.ChatPanel
          messages={messages}
          busy={busy}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={(event) => void sendPrompt(event)}
          onStop={stopGeneration}
        />
      </div>

      {newProjectOpen && (
        <UI.NewPrototypeDialog
          onClose={() => setNewProjectOpen(false)}
          onCreate={(template) => {
            createProject(template);
            setNewProjectOpen(false);
          }}
        />
      )}

      {filesOpen && (
        <UI.FileManagerDialog
          files={files}
          onClose={() => setFilesOpen(false)}
          onCreate={() => {
            setFilesOpen(false);
            setNewFileOpen(true);
          }}
          onOpen={openFile}
          onOpenSettings={(name) => {
            setFilesOpen(false);
            setFileSettingsName(name);
          }}
        />
      )}

      {newFileOpen && (
        <UI.NewFileDialog
          files={files}
          onClose={() => setNewFileOpen(false)}
          onCreate={createFile}
        />
      )}

      {fileSettingsFile && (
        <UI.FileSettingsDialog
          key={fileSettingsFile.name}
          file={fileSettingsFile}
          files={files}
          onClose={() => setFileSettingsName(null)}
          onSave={saveFileSettings}
          onDelete={deleteFile}
        />
      )}

      {paletteOpen && (
        <UI.CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />
      )}

      <UI.ShareToast state={shareState} />
    </main>
  );
}
