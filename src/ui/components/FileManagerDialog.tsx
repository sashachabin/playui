import { useState } from "react";
import { FilePlus2, Search, Settings2 } from "lucide-react";
import { Dialog } from "../Dialog";
import { FileIcon } from "../FileIcon";
import { fileKindLabel, formatFileSize } from "../lib/files";
import type { FileEntry } from "../types";

export type FileManagerDialogProps = {
  files: FileEntry[];
  onClose: () => void;
  onCreate: () => void;
  onOpen: (name: string) => void;
  onOpenSettings: (name: string) => void;
};

export function FileManagerDialog({
  files,
  onClose,
  onCreate,
  onOpen,
  onOpenSettings,
}: FileManagerDialogProps) {
  const [search, setSearch] = useState("");
  const visibleFiles = files.filter((file) =>
    file.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Dialog title="Project files" onClose={onClose}>
      <div className="modal-toolbar">
        <label className="search-field">
          <Search size={14} />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files"
            aria-label="Search files"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <FilePlus2 size={14} />
          New file
        </button>
      </div>
      <div className="file-manager" role="list">
        {visibleFiles.map((file) => (
          <div className="file-manager-row" role="listitem" key={file.name}>
            <button type="button" className="file-manager-open" onClick={() => onOpen(file.name)}>
              <FileIcon name={file.name} />
              <span className="file-manager-name">{file.name}</span>
              <span className="file-manager-meta">
                {fileKindLabel(file.name)} · {formatFileSize(file.value)}
              </span>
            </button>
            <button
              type="button"
              className="file-manager-settings"
              aria-label={`Settings for ${file.name}`}
              title="File settings"
              onClick={() => onOpenSettings(file.name)}
            >
              <Settings2 size={14} />
            </button>
          </div>
        ))}
        {visibleFiles.length === 0 && (
          <p className="file-manager-empty">No files match “{search}”.</p>
        )}
      </div>
    </Dialog>
  );
}
