import { useState } from "react";
import { Dialog } from "../Dialog";
import { FileIcon } from "../FileIcon";
import { fileKindLabel, normalizeFilePath } from "../lib/files";
import type { FileEntry } from "../types";

type NewFileDialogProps = {
  files: FileEntry[];
  onClose: () => void;
  onCreate: (name: string) => void;
};

export function NewFileDialog({ files, onClose, onCreate }: NewFileDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = normalizeFilePath(name);
    if (!next) {
      setError("Use a path like components/Button.tsx with .tsx, .ts, .css or .json.");
      return;
    }
    if (next.length > 120) {
      setError("Keep the path under 120 characters.");
      return;
    }
    if (files.some((file) => file.name === next)) {
      setError("A file with this name already exists.");
      return;
    }
    onCreate(next);
  }

  return (
    <Dialog title="New file" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-body">
          <label className="field" htmlFor="new-file-name">
            <span>File name</span>
            <input
              id="new-file-name"
              autoFocus
              value={name}
              spellCheck={false}
              placeholder="components/Button.tsx"
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
            />
          </label>
          <div className="modal-file-preview">
            <FileIcon name={name || "untitled"} />
            <span>{name ? fileKindLabel(name) : "Type follows the extension"}</span>
          </div>
          <p className="field-hint">
            Use .tsx, .ts, .css or .json. Folders are allowed. Starter content is added
            automatically.
          </p>
          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-footer">
          <span className="modal-spacer" />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Create file
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
