import { useEffect, useMemo, useRef, useState } from "react";
import type { compilePreview } from "../preview/compile";

import { ChatPanel } from "./components/ChatPanel";
import { EditorPane } from "./components/EditorPane";
import { FileManagerDialog } from "./components/FileManagerDialog";
import { FileSettingsDialog } from "./components/FileSettingsDialog";
import { Header } from "./components/Header";
import { HomeScreen } from "./components/HomeScreen";
import { NewFileDialog } from "./components/NewFileDialog";
import { NewPrototypeDialog } from "./components/NewPrototypeDialog";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { DEFAULT_PAGES, initialFiles, type ProjectTemplate } from "./data";
import { applyEditorActions } from "./lib/actions";
import {
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
import {
  buildProjectHash,
  buildShareHash,
  parseLocation,
  projectIdFromRef,
  projectRef,
} from "./lib/url";
import type { Device, EditorAction, FileEntry, Message, Page, Tab } from "./types";
import { loadWorkspace, saveWorkspace } from "./workspace";

const AI_TIMEOUT_MS = 240_000;

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
  const initialPages = workspace.pages[initialProject] ?? DEFAULT_PAGES;
  const initialConfig = parseConfig(workspace.projects[initialProject]!);
  const configuredStart =
    typeof initialConfig?.startRoute === "string" ? initialConfig.startRoute : undefined;
  const initialStart =
    configuredStart && initialPages.some((page) => page.path === configuredStart)
      ? configuredStart
      : (initialPages[0]?.path ?? "/");
  const initialFileList = workspace.projects[initialProject]!;
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
  const [openProjects, setOpenProjects] = useState([initialProject]);
  const [view, setView] = useState<"home" | "workspace">(
    initialLocation.kind === "project" && urlProject >= 0 ? "workspace" : "home",
  );
  const [projectPages, setProjectPages] = useState<Page[][]>(workspace.pages);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStorageError(!saveWorkspace({ projects, pages: projectPages, active: project }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [projects, projectPages, project]);

  const files = projects[project]!;
  const pages = projectPages[project] ?? DEFAULT_PAGES;
  const filesRef = useRef(files);
  const pagesRef = useRef(pages);
  filesRef.current = files;
  pagesRef.current = pages;

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

  const [activeFile, setActiveFile] = useState(initialFile);
  const [device, setDevice] = useState<Device>(
    initialLocation.kind === "project" ? initialLocation.device : "desktop",
  );
  const [revision, setRevision] = useState(0);
  const [route, setRoute] = useState(initialRoute);
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
  const [shareState, setShareState] = useState<"idle" | "copying" | "copied" | "error">("idle");

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
  }>();
  const [buildError, setBuildError] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let stale = false;
    const timeout = window.setTimeout(async () => {
      try {
        const runtime = await import("../preview/compile");
        const bundle = await runtime.compilePreview(
          Object.fromEntries(files.map((file) => [file.name, file.value])),
        );
        if (stale) return;
        setCompiled({ bundle, document: runtime.previewDocument });
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
  }, [files]);

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
      compiled?.document(compiled.bundle, {
        route,
        dark: isDark,
        locale,
        outlines,
        afterSubmit,
      }),
    [compiled, route, isDark, locale, outlines, afterSubmit],
  );

  useEffect(() => {
    function navigate(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const path: unknown = event.data?.route;
      if (typeof path === "string" && PAGE_PATH.test(path)) setRoute(path);
      if (typeof event.data?.error === "string") setRuntimeError(event.data.error);
    }
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  }, []);

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
    setCompiled(undefined);
    setBuildError("");
    setRuntimeError("");
    setProject(index);
    setActiveFile(
      storedFile && targetFiles.some((file) => file.name === storedFile) ? storedFile : "App.tsx",
    );
    setRoute(
      nextRoute && projectPageList.some((page) => page.path === nextRoute) ? nextRoute : start,
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

  function reorderProjects(next: number[]) {
    if (next.length === openProjects.length) setOpenProjects(next);
  }

  function renameProject(index: number, name: string) {
    setProjects((current) =>
      current.map((projectFiles, projectIndex) =>
        projectIndex === index ? writeConfig(projectFiles, { name }) : projectFiles,
      ),
    );
  }

  function selectPage(path: string) {
    setRoute(path);
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
    setRoute(path);
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
    if (route === path) setRoute(nextPath);
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
    if (route === path) setRoute(remaining[0]!.path);
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

  async function shareProject() {
    if (shareState === "copying") return;
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
          return;
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
    } catch {
      setShareState("error");
    }
  }

  async function sendPrompt(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || busy) return;
    const submittedPrompt = prompt.trim();
    setMessages((current) => [...current, { role: "user", text: submittedPrompt }]);
    setPrompt("");
    setBusy(true);
    const controller = new AbortController();
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
      setRoute(applied.route);
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
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "The request timed out. Try a smaller change or retry."
          : error instanceof Error
            ? error.message
            : "AI request failed";
      setMessages((current) => [...current, { role: "error", text: message }]);
      setPrompt((current) => current || submittedPrompt);
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
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

  if (view === "home") {
    return (
      <>
        <HomeScreen
          projects={projects}
          pages={projectPages}
          activeProject={project}
          onOpenProject={(index) => openProject(index, projects[index]!)}
          onNewProject={() => setNewProjectOpen(true)}
        />
        {newProjectOpen && (
          <NewPrototypeDialog
            onClose={() => setNewProjectOpen(false)}
            onCreate={(template) => {
              createProject(template);
              setNewProjectOpen(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <main className="app">
      <Header
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
        onReorderProjects={reorderProjects}
        onRenameProject={renameProject}
        onNewProject={() => setNewProjectOpen(true)}
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
        <ProjectSidebar
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
          onDeletePage={deletePage}
          onSetStartPage={setStartPage}
          onOpenFile={openFile}
          onNewFile={() => setNewFileOpen(true)}
          onOpenFiles={() => setFilesOpen(true)}
        />

        <section className="workspace">
          {tab === "code" ? (
            <EditorPane
              files={files}
              activeFile={activeFile}
              projectPath={projectPath}
              declarations={declarations}
              onFileChange={updateFile}
              onOpenFiles={() => setFilesOpen(true)}
              onOpenSettings={() => setFileSettingsName(activeFile)}
            />
          ) : (
            <PreviewCanvas
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
              onReload={reloadPreview}
              onDismissErrors={() => {
                setBuildError("");
                setRuntimeError("");
              }}
            />
          )}
        </section>

        <ChatPanel
          messages={messages}
          busy={busy}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={(event) => void sendPrompt(event)}
        />
      </div>

      {shareState === "copied" && (
        <div className="toast" role="status">
          Share link copied
        </div>
      )}
      {shareState === "error" && (
        <div className="toast toast-error" role="alert">
          Could not copy the share link
        </div>
      )}

      {newProjectOpen && (
        <NewPrototypeDialog
          onClose={() => setNewProjectOpen(false)}
          onCreate={(template) => {
            createProject(template);
            setNewProjectOpen(false);
          }}
        />
      )}

      {filesOpen && (
        <FileManagerDialog
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
        <NewFileDialog files={files} onClose={() => setNewFileOpen(false)} onCreate={createFile} />
      )}

      {fileSettingsFile && (
        <FileSettingsDialog
          key={fileSettingsFile.name}
          file={fileSettingsFile}
          files={files}
          onClose={() => setFileSettingsName(null)}
          onSave={saveFileSettings}
          onDelete={deleteFile}
        />
      )}
    </main>
  );
}
