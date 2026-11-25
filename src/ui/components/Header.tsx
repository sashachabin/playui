import { Check, ChevronDown, Code2, Monitor, Pencil, Plus, Share2, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { projectTitle } from "../lib/config";
import type { FileEntry, Tab } from "../types";

type HeaderProps = {
  projects: FileEntry[][];
  openProjects: number[];
  project: number;
  busy: boolean;
  tab: Tab;
  onHome: () => void;
  onOpenProject: (index: number) => void;
  onCloseProject: (index: number) => void;
  onCloseOtherProjects: (index: number) => void;
  onCloseProjectsToRight: (index: number) => void;
  onReorderProjects: (openProjects: number[]) => void;
  onRenameProject: (index: number, name: string) => void;
  onNewProject: () => void;
  onSelectTab: (tab: Tab) => void;
  onShare: () => void;
  shareState: "idle" | "copying" | "copied" | "error";
};

type DropTarget = { index: number; after: boolean };
type ContextMenu = { index: number; x: number; y: number };

export function Header({
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
  onSelectTab,
  onShare,
  shareState,
}: HeaderProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const skipBlur = useRef(false);

  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const pointerDrag = useRef<{
    index: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    active: boolean;
  } | null>(null);
  const pointerCleanup = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [overflowing, setOverflowing] = useState(false);
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false);

  useEffect(() => {
    const strip = tabsRef.current;
    const active = strip?.querySelector<HTMLElement>(".file-tab.active");
    if (!strip || !active) return;
    const frame = requestAnimationFrame(() => {
      const stripRect = strip.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      let target = strip.scrollLeft;
      if (activeRect.left < stripRect.left) {
        target += activeRect.left - stripRect.left - 4;
      } else if (activeRect.right > stripRect.right) {
        target += activeRect.right - stripRect.right + 4;
      }
      if (Math.abs(target - strip.scrollLeft) <= 1) return;
      strip.scrollTo({
        left: target,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [project, openProjects]);

  useEffect(() => {
    const element = tabsRef.current;
    if (!element) return;
    const update = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [openProjects, renaming]);

  useEffect(() => {
    if (renaming === null) return;
    const frame = requestAnimationFrame(() => {
      renameRef.current?.focus();
      renameRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [renaming]);

  useEffect(() => {
    if (!menu) return;
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [menu]);

  useEffect(() => {
    setMenu(null);
    setTabsMenuOpen(false);
  }, [openProjects]);

  useEffect(
    () => () => {
      pointerCleanup.current?.();
      document.body.classList.remove("is-dragging-tab");
    },
    [],
  );

  useEffect(() => {
    if (!overflowing) setTabsMenuOpen(false);
  }, [overflowing]);

  useEffect(() => {
    if (!menu && !tabsMenuOpen) return;
    function dismiss(event: Event) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (overflowRef.current?.contains(target)) return;
      setMenu(null);
      setTabsMenuOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenu(null);
      setTabsMenuOpen(false);
      tabsRef.current?.querySelector<HTMLButtonElement>(".file-tab.active .file-tab-main")?.focus();
    }
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [menu, tabsMenuOpen]);

  function beginRename(index: number) {
    if (busy) return;
    skipBlur.current = false;
    setMenu(null);
    setTabsMenuOpen(false);
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

  function beginPointerDrag(event: ReactPointerEvent<HTMLDivElement>, index: number) {
    if (event.button !== 0 || busy || renaming !== null || openProjects.length < 2) return;
    const target = event.target as HTMLElement;
    if (target.closest(".file-tab-close, .file-tab-rename")) return;
    pointerCleanup.current?.();
    pointerDrag.current = {
      index,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: tabsRef.current?.scrollLeft ?? 0,
      active: false,
    };
    const move = (moveEvent: PointerEvent) => {
      const state = pointerDrag.current;
      if (!state) return;
      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;
      if (!state.active && Math.hypot(dx, dy) < 5) return;
      if (!state.active) {
        state.active = true;
        setDragging(index);
        document.body.classList.add("is-dragging-tab");
      }
      moveEvent.preventDefault();
      const strip = tabsRef.current;
      if (!strip) return;
      const stripRect = strip.getBoundingClientRect();
      if (moveEvent.clientX > stripRect.right - 24) strip.scrollLeft += 10;
      if (moveEvent.clientX < stripRect.left + 24) strip.scrollLeft -= 10;
      setDragOffset(dx + strip.scrollLeft - state.scrollLeft);
      const candidates = [...strip.querySelectorAll<HTMLElement>(".file-tab")]
        .map((element) => ({
          index: Number(element.dataset.project),
          rect: element.getBoundingClientRect(),
        }))
        .filter((candidate) => candidate.index !== index);
      const hit = candidates.find(
        (candidate) =>
          moveEvent.clientX >= candidate.rect.left && moveEvent.clientX <= candidate.rect.right,
      );
      let nextTarget: DropTarget | null = null;
      if (hit) {
        nextTarget = {
          index: hit.index,
          after: moveEvent.clientX > hit.rect.left + hit.rect.width / 2,
        };
      } else {
        const first = candidates[0];
        const last = candidates[candidates.length - 1];
        if (first && moveEvent.clientX < first.rect.left) {
          nextTarget = { index: first.index, after: false };
        } else if (last && moveEvent.clientX > last.rect.right) {
          nextTarget = { index: last.index, after: true };
        }
      }
      dropTargetRef.current = nextTarget;
      setDropTarget(nextTarget);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
      pointerCleanup.current = null;
      pointerDrag.current = null;
      document.body.classList.remove("is-dragging-tab");
    };
    const finish = () => {
      const state = pointerDrag.current;
      cleanup();
      if (!state?.active) return;
      const target = dropTargetRef.current;
      if (target) reorderTo(index, target);
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      setDragging(null);
      setDragOffset(0);
      setDropTarget(null);
      dropTargetRef.current = null;
    };
    pointerCleanup.current = cleanup;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
  }

  function openTabMenu(event: React.MouseEvent, index: number) {
    event.preventDefault();
    if (renaming !== null) return;
    const width = 196;
    const height = 176;
    setTabsMenuOpen(false);
    setMenu({
      index,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8)),
    });
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

  const menuPosition = openProjects.indexOf(menu?.index ?? -1);

  return (
    <header className="app-header">
      <button
        type="button"
        className="brand brand-button"
        aria-label="PlayUI projects"
        title="Projects"
        onClick={onHome}
      >
        <span className="brand-name">PlayUI</span>
      </button>

      <div className="file-tabs-wrap">
        <div className="file-tabs" ref={tabsRef} role="tablist" aria-label="Open prototypes">
          {openProjects.map((index) => {
            const files = projects[index];
            if (!files) return null;
            const active = index === project;
            const title = projectTitle(files, index);
            const isRenaming = renaming === index;
            return (
              <div
                key={index}
                className={`file-tab ${active ? "active" : ""} ${
                  dragging === index ? "dragging" : ""
                } ${
                  dropTarget?.index === index
                    ? dropTarget.after
                      ? "drop-after"
                      : "drop-before"
                    : ""
                }`}
                role="presentation"
                data-project={index}
                style={
                  dragging === index ? { transform: `translateX(${dragOffset}px)` } : undefined
                }
                onPointerDown={(event) => beginPointerDrag(event, index)}
                onContextMenu={(event) => openTabMenu(event, index)}
                onAuxClick={(event) => {
                  if (event.button !== 1) return;
                  event.preventDefault();
                  onCloseProject(index);
                }}
                onMouseDown={(event) => {
                  if (event.button === 1) event.preventDefault();
                }}
              >
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    className="file-tab-rename"
                    value={draft}
                    maxLength={60}
                    aria-label={`Rename ${title}`}
                    onClick={(event) => event.stopPropagation()}
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
                    className="file-tab-main"
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      onOpenProject(index);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      beginRename(index);
                    }}
                    onKeyDown={(event) => navigateTabs(event, index)}
                    disabled={busy}
                    title={title}
                  >
                    <span className="file-tab-name">{title}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="file-tab-close"
                  aria-label={`Close ${title}`}
                  title={`Close ${title}`}
                  draggable={false}
                  disabled={busy}
                  onClick={() => onCloseProject(index)}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="tab-new"
          aria-label="New prototype"
          title="New prototype"
          disabled={busy}
          onClick={onNewProject}
        >
          <Plus size={15} />
        </button>
        <div className={`tabs-overflow ${overflowing ? "" : "is-hidden"}`} ref={overflowRef}>
          <button
            type="button"
            className="tabs-overflow-button"
            aria-label="All open prototypes"
            title="All open prototypes"
            aria-expanded={tabsMenuOpen}
            aria-hidden={!overflowing}
            tabIndex={overflowing ? 0 : -1}
            disabled={!overflowing}
            onClick={() => {
              setMenu(null);
              setTabsMenuOpen((current) => !current);
            }}
          >
            <ChevronDown size={14} />
          </button>
          {tabsMenuOpen && (
            <div className="tabs-list" role="menu">
              {openProjects.map((index) => {
                const label = projectTitle(projects[index] ?? [], index);
                return (
                  <button
                    key={index}
                    type="button"
                    role="menuitem"
                    className={`tabs-list-item ${index === project ? "active" : ""}`}
                    disabled={busy}
                    onClick={() => {
                      onOpenProject(index);
                      setTabsMenuOpen(false);
                    }}
                  >
                    <span>{label}</span>
                    {index === project && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="share-button"
        aria-label="Copy shareable prototype link"
        onClick={onShare}
        disabled={shareState === "copying"}
        title="Copy a shareable prototype link"
      >
        {shareState === "copied" ? <Check size={14} /> : <Share2 size={14} />}
        <span>
          {shareState === "copied" ? "Copied" : shareState === "copying" ? "Copying…" : "Share"}
        </span>
      </button>

      <div className="view-switch" role="tablist" aria-label="View">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          className={tab === "preview" ? "active" : ""}
          onClick={() => onSelectTab("preview")}
        >
          <Monitor size={14} />
          Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "code"}
          className={tab === "code" ? "active" : ""}
          onClick={() => onSelectTab("code")}
        >
          <Code2 size={14} />
          Code
        </button>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="tab-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={menuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => beginRename(menu.index)}
          >
            <Pencil size={13} />
            Rename
          </button>
          <div className="tab-menu-separator" />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              onCloseProject(menu.index);
              setMenu(null);
            }}
          >
            <X size={13} />
            Close
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy || openProjects.length <= 1}
            onClick={() => {
              onCloseOtherProjects(menu.index);
              setMenu(null);
            }}
          >
            <X size={13} />
            Close others
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy || menuPosition < 0 || menuPosition >= openProjects.length - 1}
            onClick={() => {
              onCloseProjectsToRight(menu.index);
              setMenu(null);
            }}
          >
            <X size={13} />
            Close to the right
          </button>
        </div>
      )}
    </header>
  );
}
