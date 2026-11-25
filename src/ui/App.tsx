import { useEffect, useMemo, useRef, useState } from "react";
import type { compilePreview } from "../preview/compile";

import { ChatPanel } from "./components/ChatPanel";
import { EditorPane } from "./components/EditorPane";
import { FileBrowser } from "./components/FileBrowser";
import { FileManagerDialog } from "./components/FileManagerDialog";
import { FileSettingsDialog } from "./components/FileSettingsDialog";
import { Header } from "./components/Header";
import { HomeScreen } from "./components/HomeScreen";
import { NewFileDialog } from "./components/NewFileDialog";
import { NewPrototypeDialog } from "./components/NewPrototypeDialog";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { DEFAULT_PAGES, initialFiles, type ProjectTemplate } from "./data";
import { applyEditorActions } from "./lib/actions";
import { parseConfig } from "./lib/config";
import {
  PROTECTED_FILES,
  languageFromName,
  mergeModelFiles,
  normalizeFilePath,
  rewriteImports,
  starterFileContent,
} from "./lib/files";
import { PAGE_PATH } from "./lib/pages";
import type { Device, EditorAction, FileEntry, Message, Page, Tab } from "./types";
import { loadWorkspace, saveWorkspace } from "./workspace";

const AI_TIMEOUT_MS = 240_000;

export function App() {
  const [workspace] = useState(() =>
    loadWorkspace({
      projects: [initialFiles],
      pages: [DEFAULT_PAGES],
      active: 0,
    }),
  );
  const [projects, setProjects] = useState(workspace.projects);
  const [project, setProject] = useState(workspace.active);
  const [openProjects, setOpenProjects] = useState([workspace.active]);
  const [view, setView] = useState<"home" | "workspace">("home");
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

  const [activeFile, setActiveFile] = useState("App.tsx");
  const [device, setDevice] = useState<Device>("desktop");
  const [revision, setRevision] = useState(0);
  const [route, setRoute] = useState(() => {
    const config = parseConfig(workspace.projects[workspace.active]!);
    return typeof config?.startRoute === "string" ? config.startRoute : "/";
  });
  const [dark, setDark] = useState<boolean>();
  const [tab, setTab] = useState<Tab>("preview");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [outlines, setOutlines] = useState(false);
  const [projectMessages, setProjectMessages] = useState<Record<number, Message[]>>({});
  const messages = projectMessages[project] ?? [];
  function setMessages(update: (current: Message[]) => Message[]) {
    setProjectMessages((current) => ({ ...current, [project]: update(current[project] ?? []) }));
  }

  const [filesOpen, setFilesOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [fileSettingsName, setFileSettingsName] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

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

  function openProject(index: number, projectFiles: FileEntry[]) {
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
    setCompiled(undefined);
    setBuildError("");
    setRuntimeError("");
    setProject(index);
    setActiveFile("App.tsx");
    setRoute(start);
    setDark(undefined);
    setPrompt("");
    setTab("preview");
    setFilesOpen(false);
    setNewFileOpen(false);
    setFileSettingsName(null);
    setNewProjectOpen(false);
    setRevision((value) => value + 1);
  }

  function closeProject(index: number) {
    const remaining = openProjects.filter((candidate) => candidate !== index);
    setOpenProjects(remaining);
    if (index !== project) return;
    if (remaining.length === 0) {
      setView("home");
      return;
    }
    const next = remaining[0]!;
    openProject(next, projects[next]!);
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
      const mergedFiles = mergeModelFiles(filesRef.current, changes, files);
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
        onHome={() => setView("home")}
        onOpenProject={(index) => openProject(index, projects[index]!)}
        onCloseProject={closeProject}
        onNewProject={() => setNewProjectOpen(true)}
        onSelectTab={setTab}
      />

      {storageError && (
        <div className="storage-warning" role="alert">
          Browser storage is full or unavailable. Keep this tab open to preserve your edits.
        </div>
      )}

      <div className={`app-body ${tab === "code" ? "is-coding" : "is-previewing"}`}>
        {tab === "code" && (
          <FileBrowser
            files={files}
            activeFile={activeFile}
            onOpenFile={openFile}
            onNewFile={() => setNewFileOpen(true)}
            onOpenFiles={() => setFilesOpen(true)}
          />
        )}

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
