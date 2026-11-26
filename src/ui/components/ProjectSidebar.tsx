import { File, FolderOpen, Home, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FileIcon } from "../FileIcon";
import type { FileEntry, Page } from "../types";

type ProjectSidebarProps = {
  pages: Page[];
  route: string;
  startRoute: string;
  files: FileEntry[];
  activeFile: string;
  showFiles: boolean;
  busy: boolean;
  onSelectPage: (path: string) => void;
  onAddPage: () => Page;
  onRenamePage: (path: string, label: string) => void;
  onDeletePage: (path: string) => void;
  onSetStartPage: (path: string) => void;
  onOpenFile: (name: string) => void;
  onNewFile: () => void;
  onOpenFiles: () => void;
};

type PageMenu = { path: string; x: number; y: number };

export function ProjectSidebar({
  pages,
  route,
  startRoute,
  files,
  activeFile,
  showFiles,
  busy,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onSetStartPage,
  onOpenFile,
  onNewFile,
  onOpenFiles,
}: ProjectSidebarProps) {
  const renameRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipBlur = useRef(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<PageMenu | null>(null);

  useEffect(() => {
    if (editing === null) return;
    const frame = requestAnimationFrame(() => {
      renameRef.current?.focus();
      renameRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

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
      if (event.key !== "Escape") return;
      setMenu(null);
      setEditing(null);
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

  function beginRename(page: Page) {
    if (busy) return;
    skipBlur.current = false;
    setMenu(null);
    setDraft(page.label);
    setEditing(page.path);
  }

  function commitRename() {
    if (editing === null) return;
    const label = draft.trim();
    if (label) onRenamePage(editing, label);
    setEditing(null);
  }

  function cancelRename() {
    skipBlur.current = true;
    setEditing(null);
  }

  function addPage() {
    if (busy) return;
    const page = onAddPage();
    setDraft(page.label);
    setEditing(page.path);
  }

  function openMenu(event: React.MouseEvent, page: Page) {
    event.preventDefault();
    if (busy || editing !== null) return;
    setMenu({
      path: page.path,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 204)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 152)),
    });
  }

  function menuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []),
    ];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  const menuPage = menu ? pages.find((page) => page.path === menu.path) : undefined;

  return (
    <aside
      className={`left-rail project-sidebar ${showFiles ? "has-files" : ""}`}
      aria-label="Project"
    >
      <section className="pages-section">
        <div className="rail-heading">
          <span>Pages</span>
          <span className="rail-heading-meta">
            <span className="rail-count">{pages.length}</span>
            <button
              type="button"
              className="rail-action"
              aria-label="New page"
              title="New page"
              disabled={busy}
              onClick={addPage}
            >
              <Plus size={14} />
            </button>
          </span>
        </div>
        <div className="page-list">
          {pages.map((page) => {
            const active = page.path === route;
            const isEditing = editing === page.path;
            return (
              <div
                key={page.path}
                className={`page-item-wrap ${active ? "active" : ""}`}
                onContextMenu={(event) => openMenu(event, page)}
              >
                {isEditing ? (
                  <input
                    ref={renameRef}
                    className="page-rename"
                    value={draft}
                    maxLength={60}
                    aria-label={`Rename ${page.label}`}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => {
                      if (skipBlur.current) {
                        skipBlur.current = false;
                        return;
                      }
                      commitRename();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="page-item"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelectPage(page.path)}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      beginRename(page);
                    }}
                  >
                    <span className="page-item-icon" aria-hidden="true">
                      <File size={13} />
                    </span>
                    <span className="page-item-text">
                      <span className="page-item-label">
                        {page.label}
                        {page.path === startRoute && (
                          <Home className="page-start" size={11} aria-label="Start page" />
                        )}
                      </span>
                      <span className="page-item-path">{page.path}</span>
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="page-menu-button"
                  aria-label={`Page options for ${page.label}`}
                  title="Page options"
                  disabled={busy}
                  onClick={(event) => openMenu(event, page)}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {showFiles && (
        <section className="files-section">
          <div className="rail-heading">
            <span>Files</span>
            <span className="rail-heading-meta">
              <span className="rail-count">{files.length}</span>
              <button
                type="button"
                className="rail-action"
                aria-label="New file"
                title="New file"
                onClick={onNewFile}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                className="rail-action"
                aria-label="All files"
                title="All files"
                onClick={onOpenFiles}
              >
                <FolderOpen size={14} />
              </button>
            </span>
          </div>
          <div className="file-list">
            {files.map((file) => (
              <button
                key={file.name}
                type="button"
                className={`file-item ${activeFile === file.name ? "active" : ""}`}
                onClick={() => onOpenFile(file.name)}
              >
                <FileIcon name={file.name} />
                <span>{file.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {menu && menuPage && (
        <div
          ref={menuRef}
          className="tab-menu page-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={menuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              beginRename(menuPage);
            }}
          >
            <Pencil size={13} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy || menuPage.path === startRoute}
            onClick={() => {
              onSetStartPage(menuPage.path);
              setMenu(null);
            }}
          >
            <Home size={13} />
            Set as start page
          </button>
          <div className="tab-menu-separator" />
          <button
            type="button"
            role="menuitem"
            disabled={busy || pages.length <= 1}
            onClick={() => {
              onDeletePage(menuPage.path);
              setMenu(null);
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </aside>
  );
}
