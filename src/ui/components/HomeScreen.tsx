import { Copy, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  onDeleteProject: (index: number) => void;
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
  onDeleteProject,
}: HomeScreenProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<ProjectMenu | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

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

  function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (renaming === null || !draft.trim()) return;
    onRenameProject(renaming, draft.trim());
    setRenaming(null);
  }

  function confirmDelete() {
    if (deleting === null) return;
    onDeleteProject(deleting);
    setDeleting(null);
  }

  const menuProject = menu ? projects[menu.index] : undefined;

  return (
    <main className="home">
      <header className="home-header">
        <div className="brand" aria-label="PlayUI">
          <span className="brand-name">PlayUI</span>
        </div>
        <span className="home-spacer" />
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

        <div className="project-grid">
          {projects.map((files, index) => {
            const config = parseConfig(files);
            const pageCount = pages[index]?.length ?? 0;
            const title = projectTitle(files, index);
            return (
              <div
                key={index}
                className="project-card-wrap"
                onContextMenu={(event) => openMenu(event, index)}
              >
                <button
                  type="button"
                  className={`project-card ${index === activeProject ? "is-active" : ""}`}
                  onClick={() => onOpenProject(index)}
                >
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
              setDeleting(menu.index);
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
        <Dialog title="Delete prototype" onClose={() => setDeleting(null)}>
          <div className="modal-body">
            <p className="project-delete-copy">
              Delete “{projectTitle(projects[deleting] ?? [], deleting)}” and all of its pages? This
              cannot be undone.
            </p>
          </div>
          <footer className="modal-footer">
            <span className="modal-spacer" />
            <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              Delete prototype
            </button>
          </footer>
        </Dialog>
      )}
    </main>
  );
}
