import { Button, DropdownMenu, Kebab, MenuItem, MenuSeparator, Tabs } from "@skbkontur/react-ui";
import { Check, ChevronDown, Code2, Monitor, Pencil, Plus, Search, Share2, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { projectTitle } from "../lib/config";
import type { HeaderProps } from "../components/Header";
import type { Tab } from "../types";

type DropTarget = { index: number; after: boolean };

export function KonturHeader({
  projects,
  openProjects,
  project,
  busy,
  tab,
  onHome,
  onOpenProject,
  onCloseProject,
  onCloseOtherProjects,
  onCloseProjectsToRight,
  onReorderProjects,
  onRenameProject,
  onNewProject,
  onSearch,
  onSelectTab,
  onShare,
  shareState,
}: HeaderProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const skipBlur = useRef(false);
  const suppressClick = useRef(false);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    if (renaming === null) return;
    const frame = requestAnimationFrame(() => {
      const field = tabsRef.current?.querySelector<HTMLInputElement>(".k-tab-rename");
      field?.focus();
      field?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [renaming]);

  useEffect(() => {
    const strip = tabsRef.current;
    const active = strip?.querySelector<HTMLElement>(".k-tab.is-active");
    if (!strip || !active) return;
    const frame = requestAnimationFrame(() => {
      const stripRect = strip.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      let target = strip.scrollLeft;
      if (activeRect.left < stripRect.left) target += activeRect.left - stripRect.left - 4;
      else if (activeRect.right > stripRect.right) target += activeRect.right - stripRect.right + 4;
      if (Math.abs(target - strip.scrollLeft) <= 1) return;
      strip.scrollTo({
        left: target,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [project, openProjects]);

  function beginRename(index: number) {
    if (busy) return;
    skipBlur.current = false;
    setDraft(projectTitle(projects[index] ?? [], index));
    setRenaming(index);
  }

  function commitRename() {
    if (renaming === null) return;
    const name = draft.trim();
    if (name) onRenameProject(renaming, name);
    setRenaming(null);
  }

  function cancelRename() {
    skipBlur.current = true;
    setRenaming(null);
  }

  function reorderTo(index: number, target: DropTarget) {
    const from = openProjects.indexOf(index);
    let to = openProjects.indexOf(target.index);
    if (from < 0 || to < 0) return;
    const next = [...openProjects];
    next.splice(from, 1);
    if (target.after) to += 1;
    if (from < to) to -= 1;
    next.splice(to, 0, index);
    onReorderProjects(next);
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const position = openProjects.indexOf(index);
    let nextPosition: number | undefined;
    if (event.key === "ArrowLeft")
      nextPosition = (position - 1 + openProjects.length) % openProjects.length;
    if (event.key === "ArrowRight") nextPosition = (position + 1) % openProjects.length;
    if (event.key === "Home") nextPosition = 0;
    if (event.key === "End") nextPosition = openProjects.length - 1;
    if (nextPosition === undefined) return;
    event.preventDefault();
    const next = openProjects[nextPosition];
    if (next === undefined) return;
    onOpenProject(next);
    requestAnimationFrame(() => {
      tabsRef.current?.querySelector<HTMLButtonElement>(`[data-project="${next}"]`)?.focus();
    });
  }

  return (
    <header className="app-header k-header">
      <button
        type="button"
        className="k-brand"
        aria-label="PlayUI projects"
        title="Projects"
        onClick={onHome}
      >
        <span className="k-brand-mark" aria-hidden="true" />
        <span className="k-brand-name">PlayUI</span>
        <span className="k-brand-badge">Kontur UI</span>
      </button>

      <div className="k-tabs-wrap">
        <div className="k-tabs" ref={tabsRef} role="tablist" aria-label="Open prototypes">
          {openProjects.map((index) => {
            const files = projects[index];
            if (!files) return null;
            const active = index === project;
            const title = projectTitle(files, index);
            const isRenaming = renaming === index;
            const position = openProjects.indexOf(index);
            return (
              <div
                key={index}
                data-project={index}
                className={`k-tab ${active ? "is-active" : ""} ${
                  dragging === index ? "is-dragging" : ""
                } ${
                  dropTarget?.index === index
                    ? dropTarget.after
                      ? "drop-after"
                      : "drop-before"
                    : ""
                }`}
                draggable={!busy && renaming === null && openProjects.length > 1}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                  setDragging(index);
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
                  const target = dropTarget;
                  const from = dragging;
                  setDragging(null);
                  setDropTarget(null);
                  if (from === null || !target) return;
                  suppressClick.current = true;
                  window.setTimeout(() => {
                    suppressClick.current = false;
                  }, 0);
                  reorderTo(from, target);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDropTarget(null);
                }}
                onAuxClick={(event) => {
                  if (event.button !== 1) return;
                  event.preventDefault();
                  onCloseProject(index);
                }}
                onMouseDown={(event) => {
                  if (event.button === 1) event.preventDefault();
                }}
                onDoubleClick={(event) => {
                  if ((event.target as HTMLElement).closest(".k-tab-actions")) return;
                  event.stopPropagation();
                  beginRename(index);
                }}
              >
                {isRenaming ? (
                  <input
                    className="k-tab-rename"
                    value={draft}
                    maxLength={60}
                    aria-label={`Rename ${title}`}
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
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    data-project={index}
                    className="k-tab-main"
                    disabled={busy}
                    title={title}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      onOpenProject(index);
                    }}
                    onKeyDown={(event) => navigateTabs(event, index)}
                  >
                    {title}
                  </button>
                )}
                <span className="k-tab-actions">
                  <Button
                    use="text"
                    size="small"
                    icon={<X size={13} />}
                    aria-label={`Close ${title}`}
                    title={`Close ${title}`}
                    disabled={busy}
                    onClick={() => onCloseProject(index)}
                  />
                  <Kebab
                    size="small"
                    aria-label={`Actions for ${title}`}
                    disabled={busy}
                    positions={["bottom right", "bottom left", "top right", "top left"]}
                  >
                    <MenuItem icon={<Pencil size={13} />} onClick={() => beginRename(index)}>
                      Rename
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={<X size={13} />} onClick={() => onCloseProject(index)}>
                      Close
                    </MenuItem>
                    <MenuItem
                      icon={<X size={13} />}
                      disabled={openProjects.length <= 1}
                      onClick={() => onCloseOtherProjects(index)}
                    >
                      Close others
                    </MenuItem>
                    <MenuItem
                      icon={<X size={13} />}
                      disabled={position < 0 || position >= openProjects.length - 1}
                      onClick={() => onCloseProjectsToRight(index)}
                    >
                      Close to the right
                    </MenuItem>
                  </Kebab>
                </span>
              </div>
            );
          })}
        </div>

        <Button
          use="text"
          size="small"
          icon={<Plus size={15} />}
          aria-label="New prototype"
          title="New prototype"
          disabled={busy}
          onClick={onNewProject}
        />

        {openProjects.length > 1 && (
          <DropdownMenu
            caption={
              <Button
                use="text"
                size="small"
                icon={<ChevronDown size={14} />}
                aria-label="All open prototypes"
                title="All open prototypes"
              >
                <span className="k-sr-only">All open prototypes</span>
              </Button>
            }
            menuWidth={240}
          >
            {openProjects.map((index) => {
              const label = projectTitle(projects[index] ?? [], index);
              return (
                <MenuItem
                  key={index}
                  icon={index === project ? <Check size={13} /> : undefined}
                  onClick={() => onOpenProject(index)}
                >
                  {label}
                </MenuItem>
              );
            })}
          </DropdownMenu>
        )}
      </div>

      <Button
        use="text"
        size="small"
        icon={<Search size={14} />}
        onClick={onSearch}
        title="Search and commands (⌘K)"
        aria-label="Search and commands"
        className="k-search-button"
      >
        <span className="k-search-label">Search</span>
      </Button>

      <Button
        use="outline"
        size="small"
        icon={shareState === "copied" ? <Check size={14} /> : <Share2 size={14} />}
        loading={shareState === "copying"}
        onClick={onShare}
        title="Copy a shareable prototype link"
        aria-label="Copy shareable prototype link"
        className="k-share-button"
      >
        <span className="k-share-label">
          {shareState === "copied" ? "Copied" : shareState === "copying" ? "Copying…" : "Share"}
        </span>
      </Button>

      <Tabs
        value={tab}
        onValueChange={(value) => onSelectTab(value as Tab)}
        size="small"
        className="k-view-tabs"
      >
        <Tabs.Tab id="preview" aria-label="Preview" className="k-view-tab-button">
          <span className="k-view-tab">
            <Monitor size={14} />
            <span>Preview</span>
          </span>
        </Tabs.Tab>
        <Tabs.Tab id="code" aria-label="Code" className="k-view-tab-button">
          <span className="k-view-tab">
            <Code2 size={14} />
            <span>Code</span>
          </span>
        </Tabs.Tab>
      </Tabs>
    </header>
  );
}
