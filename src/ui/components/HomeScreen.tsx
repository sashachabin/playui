import { Plus } from "lucide-react";
import { Brand } from "../Brand";
import { designSystemLabel, parseConfig, projectTitle } from "../lib/config";
import type { FileEntry, Page } from "../types";

type HomeScreenProps = {
  projects: FileEntry[][];
  pages: Page[][];
  activeProject: number;
  onOpenProject: (index: number) => void;
  onNewProject: () => void;
};

export function HomeScreen({
  projects,
  pages,
  activeProject,
  onOpenProject,
  onNewProject,
}: HomeScreenProps) {
  return (
    <main className="home">
      <header className="home-header">
        <div className="brand" aria-label="PlayUI">
          <Brand />
        </div>
        <span className="home-crumb">Projects</span>
        <span className="home-spacer" />
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
            return (
              <button
                key={index}
                type="button"
                className={`project-card ${index === activeProject ? "is-active" : ""}`}
                onClick={() => onOpenProject(index)}
              >
                <span className="project-thumb" aria-hidden="true">
                  <span className="project-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="project-frame">
                    <span className="project-frame-title">{projectTitle(files, index)}</span>
                    <span className="project-frame-line" />
                    <span className="project-frame-line short" />
                    <span className="project-frame-button" />
                  </span>
                </span>
                <span className="project-meta">
                  <strong>{projectTitle(files, index)}</strong>
                  <span>
                    {designSystemLabel(config?.designSystem)} · {pageCount}{" "}
                    {pageCount === 1 ? "page" : "pages"}
                  </span>
                </span>
              </button>
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
    </main>
  );
}
