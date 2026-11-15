import { Code2, Monitor, Plus } from "lucide-react";
import { Logo } from "../Logo";
import { projectTitle } from "../lib/config";
import type { FileEntry, Tab } from "../types";

type HeaderProps = {
  projects: FileEntry[][];
  project: number;
  busy: boolean;
  tab: Tab;
  onOpenProject: (index: number) => void;
  onNewProject: () => void;
  onSelectTab: (tab: Tab) => void;
};

export function Header({
  projects,
  project,
  busy,
  tab,
  onOpenProject,
  onNewProject,
  onSelectTab,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand" aria-label="PlayUI">
        <span className="brand-mark" aria-hidden="true">
          <Logo />
        </span>
        <span className="brand-name">PlayUI</span>
      </div>
      <div className="file-tabs-wrap">
        <div className="file-tabs" role="tablist" aria-label="Prototypes">
          {projects.map((files, index) => {
            const active = index === project;
            const title = projectTitle(files, index);
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={active}
                className={`file-tab ${active ? "active" : ""}`}
                onClick={() => onOpenProject(index)}
                disabled={busy}
                title={title}
              >
                <span className="file-tab-name">{title}</span>
              </button>
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
