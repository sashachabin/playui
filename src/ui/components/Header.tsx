import { Code2, Monitor, Plus, X } from "lucide-react";
import { Logo } from "../Logo";
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
  onNewProject: () => void;
  onSelectTab: (tab: Tab) => void;
};

export function Header({
  projects,
  openProjects,
  project,
  busy,
  tab,
  onHome,
  onOpenProject,
  onCloseProject,
  onNewProject,
  onSelectTab,
}: HeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="brand brand-button"
        aria-label="PlayUI projects"
        onClick={onHome}
      >
        <span className="brand-mark" aria-hidden="true">
          <Logo />
        </span>
        <span className="brand-name">PlayUI</span>
      </button>
      <button type="button" className="header-crumb" onClick={onHome}>
        Projects
      </button>

      <div className="file-tabs-wrap">
        <div className="file-tabs" role="tablist" aria-label="Open prototypes">
          {openProjects.map((index) => {
            const files = projects[index];
            if (!files) return null;
            const active = index === project;
            const title = projectTitle(files, index);
            return (
              <div key={index} className={`file-tab ${active ? "active" : ""}`} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="file-tab-main"
                  onClick={() => onOpenProject(index)}
                  disabled={busy}
                  title={title}
                >
                  <span className="file-tab-name">{title}</span>
                </button>
                <button
                  type="button"
                  className="file-tab-close"
                  aria-label={`Close ${title}`}
                  title={`Close ${title}`}
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
      </div>

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
    </header>
  );
}
