import {
  Button,
  Checkbox,
  DropdownMenu,
  Input,
  MenuItem,
  MenuSeparator,
  Textarea,
} from "@skbkontur/react-ui";
import {
  Check,
  Copy,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HomeScreenProps } from "../components/HomeScreen";
import { ProjectPreview } from "../ProjectPreview";
import { designSystemLabel, parseConfig, projectTitle } from "../lib/config";
import { dialogIsOpen } from "../lib/dialogs";
import { uiVariantHref } from "../ui-variant";
import { KonturDialog } from "./Dialog";

type DropTarget = { index: number; after: boolean };

export function KonturHomeScreen({
  projects,
  pages,
  activeProject,
  onOpenProject,
  onNewProject,
  onSearch,
  onRenameProject,
  onDuplicateProject,
  onDeleteProjects,
  onReorderProjects,
  onGenerateProject,
}: HomeScreenProps) {
  const [renaming, setRenaming] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number[] | null>(null);
  const [draft, setDraft] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      document.body.classList.remove("is-dragging-project");
    },
    [],
  );

  function clearSelection() {
    setSelectMode(false);
    setSelected(new Set());
    setAnchor(null);
  }

  function toggleSelection(index: number, range = false) {
    setSelectMode(true);
    setSelected((current) => {
      const next = new Set(current);
      if (range && anchor !== null) {
        const start = Math.min(anchor, index);
        const end = Math.max(anchor, index);
        for (let value = start; value <= end; value += 1) next.add(value);
      } else if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    setAnchor(index);
  }

  function selectAll() {
    setSelectMode(true);
    setSelected(new Set(projects.map((_, index) => index)));
  }

  function cardClick(event: React.MouseEvent, index: number) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (selectMode || event.metaKey || event.ctrlKey || event.shiftKey) {
      event.preventDefault();
      toggleSelection(index, event.shiftKey);
      return;
    }
    onOpenProject(index);
  }

  function beginRename(index: number) {
    setDraft(projectTitle(projects[index] ?? [], index));
    setRenaming(index);
  }

  function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (renaming === null || !draft.trim()) return;
    onRenameProject(renaming, draft.trim());
    setRenaming(null);
  }

  function confirmDelete() {
    if (deleting === null) return;
    onDeleteProjects(deleting);
    setDeleting(null);
    clearSelection();
  }

  function submitGeneration() {
    const value = generationPrompt.trim();
    if (!value) return;
    onGenerateProject(value);
    setGenerationPrompt("");
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (deleting !== null || renaming !== null) return;
      if (dialogIsOpen()) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Escape") {
        clearSelection();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selected.size > 0) {
        event.preventDefault();
        setDeleting([...selected]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="k-home ui-kontur">
      <header className="k-home-header">
        <div className="k-brand" aria-label="PlayUI">
          <span className="k-brand-mark" aria-hidden="true" />
          <span className="k-brand-name">PlayUI</span>
          <span className="k-brand-badge">Kontur UI</span>
        </div>
        <span className="k-home-spacer" />
        {projects.length > 0 && (
          <Button
            use="text"
            size="small"
            active={selectMode}
            icon={<Check size={14} />}
            aria-label={selectMode ? "Finish selecting prototypes" : "Select prototypes"}
            aria-pressed={selectMode}
            title={selectMode ? "Finish selecting" : "Select prototypes"}
            onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
          >
            <span className="k-home-select-label">{selectMode ? "Done" : "Select"}</span>
          </Button>
        )}
        <Button
          use="text"
          size="small"
          icon={<Search size={14} />}
          onClick={onSearch}
          title="Search and commands (⌘K)"
          aria-label="Search and commands"
        >
          <span className="k-home-search-label">Search</span>
        </Button>
        <Button
          use="accent"
          size="small"
          icon={<Plus size={14} />}
          aria-label="New prototype"
          title="New prototype"
          onClick={onNewProject}
        >
          <span className="k-home-new-label">New prototype</span>
        </Button>
        <a className="k-ui-switch" href={uiVariantHref("classic")} title="Switch to the classic UI">
          Classic UI
        </a>
      </header>

      <div className="k-home-main">
        <div className="k-home-title">
          <div>
            <h1>Projects</h1>
            <p>Prototype screens, flows and design systems in one place.</p>
          </div>
          <span className="k-home-count">
            {projects.length} {projects.length === 1 ? "draft" : "drafts"}
          </span>
        </div>

        {projects.length === 0 ? (
          <section className="k-generate" aria-labelledby="k-home-generate-title">
            <span className="k-generate-eyebrow">Kontur UI edition</span>
            <h2 id="k-home-generate-title">What do you want to build?</h2>
            <p>
              Describe a screen or flow. PlayUI generates the first version, then you can refine it
              in chat.
            </p>
            <form
              className="k-generate-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitGeneration();
              }}
            >
              <Textarea
                aria-label="Describe the prototype to generate"
                value={generationPrompt}
                width="100%"
                rows={3}
                autoResize
                placeholder="A checkout flow for a SaaS product…"
                onValueChange={setGenerationPrompt}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    submitGeneration();
                  }
                }}
              />
              <div className="k-generate-bar">
                <span>⌘↵ to generate</span>
                <Button use="accent" size="small" type="submit" disabled={!generationPrompt.trim()}>
                  Generate prototype
                </Button>
              </div>
            </form>
            <div className="k-generate-examples" aria-label="Prompt ideas">
              {[
                "A checkout flow for a SaaS product",
                "A team settings page",
                "An onboarding wizard for a mobile app",
              ].map((example) => (
                <Button
                  key={example}
                  use="outline"
                  size="small"
                  onClick={() => setGenerationPrompt(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
            <Button use="text" size="small" onClick={onNewProject} className="k-generate-template">
              Or start from a template
            </Button>
          </section>
        ) : (
          <div className={`k-project-grid ${selectMode ? "is-selecting" : ""}`}>
            {projects.map((files, index) => {
              const config = parseConfig(files);
              const pageCount = pages[index]?.length ?? 0;
              const title = projectTitle(files, index);
              return (
                <div
                  key={index}
                  data-project-index={index}
                  className={`k-project-card-wrap ${selected.has(index) ? "is-selected" : ""} ${
                    dragging === index ? "is-dragging" : ""
                  } ${
                    dropTarget?.index === index
                      ? dropTarget.after
                        ? "drop-after"
                        : "drop-before"
                      : ""
                  }`}
                  draggable={!selectMode}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                    setDragging(index);
                    document.body.classList.add("is-dragging-project");
                  }}
                  onDragOver={(event) => {
                    if (dragging === null || dragging === index) return;
                    event.preventDefault();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setDropTarget({
                      index,
                      after: event.clientX > rect.left + rect.width / 2,
                    });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = dragging;
                    const target = dropTarget;
                    setDragging(null);
                    setDropTarget(null);
                    document.body.classList.remove("is-dragging-project");
                    if (from === null || !target) return;
                    suppressClick.current = true;
                    window.setTimeout(() => {
                      suppressClick.current = false;
                    }, 0);
                    let to = target.index;
                    if (target.after) to += 1;
                    if (from < to) to -= 1;
                    if (to !== from) onReorderProjects(from, to);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setDropTarget(null);
                    document.body.classList.remove("is-dragging-project");
                  }}
                >
                  <button
                    type="button"
                    className={`k-project-card ${index === activeProject ? "is-active" : ""}`}
                    onClick={(event) => cardClick(event, index)}
                  >
                    <span className="k-project-thumb">
                      <ProjectPreview files={files} pages={pages[index] ?? []} />
                    </span>
                    <span className="k-project-meta">
                      <strong>{title}</strong>
                      <span>
                        {designSystemLabel(config?.designSystem)} · {pageCount}{" "}
                        {pageCount === 1 ? "page" : "pages"}
                      </span>
                    </span>
                  </button>
                  <span className="k-card-check" onPointerDown={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(index)}
                      aria-label={`Select ${title}`}
                      onValueChange={() => toggleSelection(index)}
                    />
                  </span>
                  <span className="k-project-actions">
                    <DropdownMenu
                      caption={
                        <Button
                          use="text"
                          size="small"
                          icon={<MoreHorizontal size={16} />}
                          aria-label={`Manage ${title}`}
                          title="Manage prototype"
                        >
                          <span className="k-sr-only">Manage prototype</span>
                        </Button>
                      }
                      menuWidth={204}
                      positions={["bottom right", "bottom left", "top right", "top left"]}
                    >
                      <MenuItem
                        icon={<FolderOpen size={13} />}
                        onClick={() => onOpenProject(index)}
                      >
                        Open
                      </MenuItem>
                      <MenuItem icon={<Pencil size={13} />} onClick={() => beginRename(index)}>
                        Rename
                      </MenuItem>
                      <MenuItem icon={<Copy size={13} />} onClick={() => onDuplicateProject(index)}>
                        Duplicate
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem icon={<Trash2 size={13} />} onClick={() => setDeleting([index])}>
                        Delete
                      </MenuItem>
                    </DropdownMenu>
                  </span>
                </div>
              );
            })}

            <button type="button" className="k-project-new" onClick={onNewProject}>
              <span className="k-project-new-plus">
                <Plus size={20} />
              </span>
              <span>New prototype</span>
            </button>
          </div>
        )}
      </div>

      {renaming !== null && (
        <KonturDialog title="Rename prototype" onClose={() => setRenaming(null)} width={480}>
          <form className="k-dialog-form" onSubmit={submitRename}>
            <div className="k-dialog-body">
              <label className="k-field">
                <span>Name</span>
                <Input
                  autoFocus
                  width="100%"
                  value={draft}
                  maxLength={80}
                  onValueChange={setDraft}
                />
              </label>
            </div>
            <footer className="k-dialog-footer">
              <Button use="outline" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button use="accent" type="submit" disabled={!draft.trim()}>
                Save name
              </Button>
            </footer>
          </form>
        </KonturDialog>
      )}

      {deleting !== null && (
        <KonturDialog
          title={deleting.length === 1 ? "Delete prototype" : "Delete prototypes"}
          onClose={() => setDeleting(null)}
          width={480}
        >
          <div className="k-dialog-form">
            <div className="k-dialog-body">
              <p className="k-dialog-copy">
                {deleting.length === 1
                  ? `Delete “${projectTitle(projects[deleting[0]!] ?? [], deleting[0]!)}” and all of its pages?`
                  : `Delete ${deleting.length} prototypes and all of their pages?`}{" "}
                This cannot be undone.
              </p>
            </div>
            <footer className="k-dialog-footer">
              <Button use="outline" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button use="danger" onClick={confirmDelete}>
                {deleting.length === 1
                  ? "Delete prototype"
                  : `Delete ${deleting.length} prototypes`}
              </Button>
            </footer>
          </div>
        </KonturDialog>
      )}

      {selectMode && (
        <div className="k-selection-bar" role="status">
          <span className="k-selection-count">
            {selected.size === 0 ? "Select prototypes" : `${selected.size} selected`}
          </span>
          <Button use="outline" size="small" onClick={selectAll}>
            Select all
          </Button>
          <Button
            use="outline"
            size="small"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
          <span className="k-selection-spacer" />
          <Button
            use="danger"
            size="small"
            disabled={selected.size === 0}
            onClick={() => setDeleting([...selected])}
          >
            Delete
          </Button>
          <Button use="accent" size="small" onClick={clearSelection}>
            Done
          </Button>
        </div>
      )}
    </main>
  );
}
