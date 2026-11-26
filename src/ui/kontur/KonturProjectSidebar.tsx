import { Button, DropdownMenu, MenuItem, MenuSeparator } from "@skbkontur/react-ui";
import { Copy, File, FolderOpen, Home, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProjectSidebarProps } from "../components/ProjectSidebar";
import { FileIcon } from "../FileIcon";
import type { Page } from "../types";

type DropTarget = { path: string; after: boolean };

export function KonturProjectSidebar({
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
  onDuplicatePage,
  onReorderPages,
  onDeletePage,
  onSetStartPage,
  onOpenFile,
  onNewFile,
  onOpenFiles,
}: ProjectSidebarProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const skipBlur = useRef(false);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      document.body.classList.remove("is-dragging-page");
    },
    [],
  );

  function beginRename(page: Page) {
    if (busy) return;
    skipBlur.current = false;
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

  return (
    <aside className={`left-rail k-sidebar ${showFiles ? "has-files" : ""}`} aria-label="Project">
      <section className="k-rail-section">
        <div className="k-rail-heading">
          <span>Pages</span>
          <span className="k-rail-heading-meta">
            <span className="k-rail-count">{pages.length}</span>
            <Button
              use="text"
              size="small"
              icon={<Plus size={14} />}
              aria-label="New page"
              title="New page"
              disabled={busy}
              onClick={addPage}
            />
          </span>
        </div>
        <div className="k-page-list">
          {pages.map((page) => {
            const active = page.path === route;
            const isEditing = editing === page.path;
            return (
              <div
                key={page.path}
                data-page={page.path}
                className={`k-page-row ${active ? "is-active" : ""} ${
                  dragging === page.path ? "is-dragging" : ""
                } ${
                  dropTarget?.path === page.path
                    ? dropTarget.after
                      ? "drop-after"
                      : "drop-before"
                    : ""
                }`}
                draggable={!busy && editing === null}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", page.path);
                  setDragging(page.path);
                  document.body.classList.add("is-dragging-page");
                }}
                onDragOver={(event) => {
                  if (dragging === null || dragging === page.path) return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDropTarget({
                    path: page.path,
                    after: event.clientY > rect.top + rect.height / 2,
                  });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromPath = dragging;
                  const target = dropTarget;
                  setDragging(null);
                  setDropTarget(null);
                  document.body.classList.remove("is-dragging-page");
                  if (fromPath === null || !target) return;
                  suppressClick.current = true;
                  window.setTimeout(() => {
                    suppressClick.current = false;
                  }, 0);
                  const from = pages.findIndex((candidate) => candidate.path === fromPath);
                  let to = pages.findIndex((candidate) => candidate.path === target.path);
                  if (from < 0 || to < 0) return;
                  if (target.after) to += 1;
                  if (from < to) to -= 1;
                  if (from !== to) onReorderPages(from, to);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDropTarget(null);
                  document.body.classList.remove("is-dragging-page");
                }}
              >
                {isEditing ? (
                  <input
                    className="k-page-rename"
                    autoFocus
                    value={draft}
                    maxLength={60}
                    aria-label={`Rename ${page.label}`}
                    onFocus={(event) => event.currentTarget.select()}
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
                  <>
                    <button
                      type="button"
                      className="k-page-main"
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        onSelectPage(page.path);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        beginRename(page);
                      }}
                    >
                      <span className="k-page-icon" aria-hidden="true">
                        <File size={13} />
                      </span>
                      <span className="k-page-text">
                        <span className="k-page-label">
                          {page.label}
                          {page.path === startRoute && (
                            <Home className="k-page-start" size={11} aria-label="Start page" />
                          )}
                        </span>
                        <span className="k-page-path">{page.path}</span>
                      </span>
                    </button>
                    <DropdownMenu
                      caption={
                        <Button
                          use="text"
                          size="small"
                          icon={<MoreHorizontal size={14} />}
                          aria-label={`Page options for ${page.label}`}
                          title="Page options"
                          disabled={busy}
                        >
                          <span className="k-sr-only">Page options</span>
                        </Button>
                      }
                      menuWidth={210}
                      positions={["bottom right", "bottom left", "top right", "top left"]}
                    >
                      <MenuItem icon={<Pencil size={13} />} onClick={() => beginRename(page)}>
                        Rename
                      </MenuItem>
                      <MenuItem
                        icon={<Copy size={13} />}
                        onClick={() => onDuplicatePage(page.path)}
                      >
                        Duplicate
                      </MenuItem>
                      <MenuItem
                        icon={<Home size={13} />}
                        disabled={page.path === startRoute}
                        onClick={() => onSetStartPage(page.path)}
                      >
                        Set as start page
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem
                        icon={<Trash2 size={13} />}
                        disabled={pages.length <= 1}
                        onClick={() => onDeletePage(page.path)}
                      >
                        Delete
                      </MenuItem>
                    </DropdownMenu>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {showFiles && (
        <section className="k-rail-section k-files-section">
          <div className="k-rail-heading">
            <span>Files</span>
            <span className="k-rail-heading-meta">
              <span className="k-rail-count">{files.length}</span>
              <Button
                use="text"
                size="small"
                icon={<Plus size={14} />}
                aria-label="New file"
                title="New file"
                onClick={onNewFile}
              />
              <Button
                use="text"
                size="small"
                icon={<FolderOpen size={14} />}
                aria-label="All files"
                title="All files"
                onClick={onOpenFiles}
              />
            </span>
          </div>
          <div className="k-file-list">
            {files.map((file) => (
              <button
                key={file.name}
                type="button"
                className={`k-file-row ${activeFile === file.name ? "is-active" : ""}`}
                onClick={() => onOpenFile(file.name)}
              >
                <FileIcon name={file.name} />
                <span>{file.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
