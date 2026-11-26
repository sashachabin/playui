import {
  Check,
  CheckSquare,
  Copy,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "../Dialog";
import { designSystemLabel, parseConfig, projectTitle } from "../lib/config";
import type { FileEntry, Page } from "../types";

type HomeScreenProps = {
  projects: FileEntry[][];
  pages: Page[][];
  activeProject: number;
  onOpenProject: (index: number) => void;
  onNewProject: () => void;
  onSearch: () => void;
  onRenameProject: (index: number, name: string) => void;
  onDuplicateProject: (index: number) => void;
  onDeleteProjects: (indices: number[]) => void;
  onReorderProjects: (from: number, to: number) => void;
};

type ProjectMenu = { index: number; x: number; y: number };

export function HomeScreen({
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
}: HomeScreenProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<ProjectMenu | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number[] | null>(null);
  const [draft, setDraft] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropProject, setDropProject] = useState<{ index: number; after: boolean } | null>(null);
  const dropProjectRef = useRef<{ index: number; after: boolean } | null>(null);
  const dragState = useRef<{
    index: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!menu) return;
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    function dismiss(event: Event) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [menu]);

  function openMenu(event: React.MouseEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.right - 204;
    const y = event.clientY || rect.bottom + 4;
    setMenu({
      index,
      x: Math.max(8, Math.min(x, window.innerWidth - 204)),
      y: Math.max(8, Math.min(y, window.innerHeight - 172)),
    });
  }

  function beginRename(index: number) {
    setDraft(projectTitle(projects[index] ?? [], index));
    setMenu(null);
    setRenaming(index);
  }

  useEffect(
    () => () => {
      dragCleanup.current?.();
    },
    [],
  );

  function beginProjectDrag(event: React.PointerEvent<HTMLDivElement>, index: number) {
    if (
      event.button !== 0 ||
      event.pointerType !== "mouse" ||
      selectMode ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }
    if ((event.target as HTMLElement).closest(".project-card-menu")) return;
    dragCleanup.current?.();
    dragState.current = {
      index,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    const move = (moveEvent: PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      if (
        !state.active &&
        Math.hypot(moveEvent.clientX - state.startX, moveEvent.clientY - state.startY) < 6
      ) {
        return;
      }
      if (!state.active) {
        state.active = true;
        setDragging(state.index);
        document.body.classList.add("is-dragging-project");
      }
      moveEvent.preventDefault();
      const cards = [
        ...document.querySelectorAll<HTMLElement>(".project-card-wrap[data-project-index]"),
      ].filter((card) => card.dataset.projectIndex !== String(state.index));
      const hit = cards.find((card) => {
        const rect = card.getBoundingClientRect();
        return (
          moveEvent.clientX >= rect.left &&
          moveEvent.clientX <= rect.right &&
          moveEvent.clientY >= rect.top &&
          moveEvent.clientY <= rect.bottom
        );
      });
      if (hit) {
        const rect = hit.getBoundingClientRect();
        const nextTarget = {
          index: Number(hit.dataset.projectIndex),
          after: moveEvent.clientX > rect.left + rect.width / 2,
        };
        dropProjectRef.current = nextTarget;
        setDropProject(nextTarget);
      } else {
        dropProjectRef.current = null;
        setDropProject(null);
      }
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      dragCleanup.current = null;
      dragState.current = null;
      document.body.classList.remove("is-dragging-project");
    };
    const finish = () => {
      const state = dragState.current;
      const target = dropProjectRef.current;
      cleanup();
      dropProjectRef.current = null;
      setDropProject(null);
      setDragging(null);
      if (!state?.active) return;
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      if (!target) return;
      let to = target.index;
      if (target.after) to += 1;
      if (state.index < to) to -= 1;
      if (to !== state.index) onReorderProjects(state.index, to);
    };
    dragCleanup.current = cleanup;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

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

  function selectAll() {
    setSelectMode(true);
    setSelected(new Set(projects.map((_, index) => index)));
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (deleting || renaming !== null) return;
      if (document.querySelector(".modal")) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Escape") {
        setMenu(null);
        clearSelection();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selected.size > 0 &&
        selected.size < projects.length
      ) {
        event.preventDefault();
        setDeleting([...selected]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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

  const menuProject = menu ? projects[menu.index] : undefined;

  return (
    <main className="home">
      <header className="home-header">
        <div className="brand" aria-label="PlayUI">
          <span className="brand-name">PlayUI</span>
        </div>
        <span className="home-spacer" />
        <button
          type="button"
          className={`home-select ${selectMode ? "active" : ""}`}
          onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
        >
          <CheckSquare size={14} />
          <span>{selectMode ? "Done" : "Select"}</span>
        </button>
        <button type="button" className="home-search" onClick={onSearch}>
          <Search size={14} />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewProject}>
          <Plus size={14} />
          New prototype
        </button>
      </header>

      <div className="home-main">
        <div className="home-title">
          <div>
            <h1>Projects</h1>
            <p>Prototype screens, flows and design systems in one place.</p>
          </div>
          <span className="home-count">
            {projects.length} {projects.length === 1 ? "draft" : "drafts"}
          </span>
        </div>

        <div className={`project-grid ${selectMode ? "is-selecting" : ""}`}>
          {projects.map((files, index) => {
            const config = parseConfig(files);
            const pageCount = pages[index]?.length ?? 0;
            const title = projectTitle(files, index);
            return (
              <div
                key={index}
                data-project-index={index}
                className={`project-card-wrap ${selected.has(index) ? "is-selected" : ""} ${
                  dragging === index ? "dragging" : ""
                } ${
                  dropProject?.index === index
                    ? dropProject.after
                      ? "drop-after"
                      : "drop-before"
                    : ""
                }`}
                onPointerDown={(event) => beginProjectDrag(event, index)}
                onContextMenu={(event) => openMenu(event, index)}
              >
                <button
                  type="button"
                  className={`project-card ${index === activeProject ? "is-active" : ""}`}
                  onClick={(event) => cardClick(event, index)}
                >
                  <span className="project-select" aria-hidden="true">
                    {selected.has(index) && <Check size={12} />}
                  </span>
                  <span className="project-thumb" aria-hidden="true">
                    <span className="project-frame">
                      <span className="project-frame-title">{title}</span>
                      <span className="project-frame-line" />
                      <span className="project-frame-line short" />
                      <span className="project-frame-button" />
                    </span>
                  </span>
                  <span className="project-meta">
                    <strong>{title}</strong>
                    <span>
                      {designSystemLabel(config?.designSystem)} · {pageCount}{" "}
                      {pageCount === 1 ? "page" : "pages"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="project-card-menu"
                  aria-label={`Manage ${title}`}
                  title="Manage prototype"
                  onClick={(event) => openMenu(event, index)}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            );
          })}

          <button type="button" className="project-card project-card--new" onClick={onNewProject}>
            <span className="project-new-plus">
              <Plus size={20} />
            </span>
            <span>New prototype</span>
          </button>
        </div>
      </div>

      {menu && menuProject && (
        <div
          ref={menuRef}
          className="tab-menu project-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenProject(menu.index);
              setMenu(null);
            }}
          >
            <FolderOpen size={13} />
            Open
          </button>
          <button type="button" role="menuitem" onClick={() => beginRename(menu.index)}>
            <Pencil size={13} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDuplicateProject(menu.index);
              setMenu(null);
            }}
          >
            <Copy size={13} />
            Duplicate
          </button>
          <div className="tab-menu-separator" />
          <button
            type="button"
            role="menuitem"
            disabled={projects.length <= 1}
            onClick={() => {
              setDeleting([menu.index]);
              setMenu(null);
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}

      {renaming !== null && (
        <Dialog title="Rename prototype" onClose={() => setRenaming(null)}>
          <form className="modal-form" onSubmit={submitRename}>
            <div className="modal-body">
              <label className="field" htmlFor="project-rename">
                <span>Name</span>
                <input
                  id="project-rename"
                  autoFocus
                  value={draft}
                  maxLength={80}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
            </div>
            <footer className="modal-footer">
              <span className="modal-spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setRenaming(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
                Save name
              </button>
            </footer>
          </form>
        </Dialog>
      )}

      {deleting !== null && (
        <Dialog
          title={deleting.length === 1 ? "Delete prototype" : "Delete prototypes"}
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            <p className="project-delete-copy">
              {deleting.length === 1
                ? `Delete “${projectTitle(projects[deleting[0]!] ?? [], deleting[0]!)}” and all of its pages?`
                : `Delete ${deleting.length} prototypes and all of their pages?`}{" "}
              This cannot be undone.
            </p>
          </div>
          <footer className="modal-footer">
            <span className="modal-spacer" />
            <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              {deleting.length === 1 ? "Delete prototype" : `Delete ${deleting.length} prototypes`}
            </button>
          </footer>
        </Dialog>
      )}

      {selectMode && (
        <div className="selection-bar" role="status">
          <span className="selection-count">
            {selected.size === 0 ? "Select prototypes" : `${selected.size} selected`}
          </span>
          <button type="button" className="btn btn-secondary" onClick={selectAll}>
            Select all
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
          <span className="selection-spacer" />
          <button
            type="button"
            className="btn btn-danger"
            disabled={selected.size === 0 || selected.size >= projects.length}
            title={
              selected.size >= projects.length
                ? "Keep at least one prototype"
                : "Delete selected prototypes"
            }
            onClick={() => setDeleting([...selected])}
          >
            Delete
          </button>
          <button type="button" className="btn btn-primary" onClick={clearSelection}>
            Done
          </button>
        </div>
      )}
    </main>
  );
}
