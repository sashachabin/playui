import { FolderOpen, Plus } from "lucide-react";
import { FileIcon } from "../FileIcon";
import type { FileEntry } from "../types";

type FileBrowserProps = {
  files: FileEntry[];
  activeFile: string;
  onOpenFile: (name: string) => void;
  onNewFile: () => void;
  onOpenFiles: () => void;
};

export function FileBrowser({
  files,
  activeFile,
  onOpenFile,
  onNewFile,
  onOpenFiles,
}: FileBrowserProps) {
  return (
    <aside className="left-rail" aria-label="Project files">
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
    </aside>
  );
}
