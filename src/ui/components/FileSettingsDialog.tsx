import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "../Dialog";
import { FileIcon } from "../FileIcon";
import { PROTECTED_FILES, fileKindLabel, formatFileSize, normalizeFilePath } from "../lib/files";
import type { FileEntry } from "../types";

type FileSettingsDialogProps = {
  file: FileEntry;
  files: FileEntry[];
  onClose: () => void;
  onSave: (nextName: string) => void;
  onDelete: () => void;
};

export function FileSettingsDialog({
  file,
  files,
  onClose,
  onSave,
  onDelete,
}: FileSettingsDialogProps) {
  const [draft, setDraft] = useState(file.name);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isProtected = PROTECTED_FILES.has(file.name);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isProtected) return;
    const next = normalizeFilePath(draft);
    if (!next) {
      setError("Use a path like components/Button.tsx with .tsx, .ts, .css or .json.");
      return;
    }
    if (next === file.name) {
      onClose();
      return;
    }
    if (PROTECTED_FILES.has(next)) {
      setError("This name is reserved for the project.");
      return;
    }
    if (files.some((candidate) => candidate.name === next)) {
      setError("A file with this name already exists.");
      return;
    }
    onSave(next);
  }

  return (
    <Dialog title="File settings" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-body">
          <label className="field" htmlFor="file-name">
            <span>File name</span>
            <input
              id="file-name"
              autoFocus
              value={draft}
              spellCheck={false}
              disabled={isProtected}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
                setConfirmingDelete(false);
              }}
            />
          </label>
          <div className="modal-file-preview">
            <FileIcon name={draft || file.name} />
            <span>{fileKindLabel(draft || file.name)}</span>
            <span className="modal-file-size">{formatFileSize(file.value)}</span>
          </div>
          {isProtected ? (
            <p className="field-hint">
              {file.name === "App.tsx"
                ? "App.tsx is the entry point; it cannot be renamed or deleted."
                : "Project settings are stored in this file and can be edited through chat."}
            </p>
          ) : (
            <p className="field-hint">Renaming updates relative imports in React files.</p>
          )}
          {confirmingDelete && (
            <p className="modal-error">Deleting this file can break imports that use it.</p>
          )}
          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-footer">
          {!isProtected &&
            (confirmingDelete ? (
              <button type="button" className="btn btn-danger" onClick={onDelete}>
                <Trash2 size={14} />
                Delete permanently
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost-danger"
                onClick={() => {
                  setConfirmingDelete(true);
                  setError("");
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            ))}
          <span className="modal-spacer" />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isProtected || !draft.trim()}>
            Save changes
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
