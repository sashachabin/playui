import { Button, Input } from "@skbkontur/react-ui";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { FileSettingsDialogProps } from "../components/FileSettingsDialog";
import { FileIcon } from "../FileIcon";
import { PROTECTED_FILES, fileKindLabel, formatFileSize, normalizeFilePath } from "../lib/files";
import { KonturDialog } from "./Dialog";

export function KonturFileSettingsDialog({
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
    <KonturDialog title="File settings" onClose={onClose} width={520}>
      <form className="k-dialog-form" onSubmit={submit}>
        <div className="k-dialog-body">
          <label className="k-field">
            <span>File name</span>
            <Input
              autoFocus
              width="100%"
              value={draft}
              spellCheck={false}
              disabled={isProtected}
              onValueChange={(value) => {
                setDraft(value);
                setError("");
                setConfirmingDelete(false);
              }}
            />
          </label>
          <div className="k-dialog-file-preview">
            <FileIcon name={draft || file.name} />
            <span>{fileKindLabel(draft || file.name)}</span>
            <span className="k-dialog-file-size">{formatFileSize(file.value)}</span>
          </div>
          {isProtected ? (
            <p className="k-field-hint">
              {file.name === "App.tsx"
                ? "App.tsx is the entry point; it cannot be renamed or deleted."
                : "Project settings are stored in this file and can be edited through chat."}
            </p>
          ) : (
            <p className="k-field-hint">Renaming updates relative imports in React files.</p>
          )}
          {confirmingDelete && (
            <p className="k-dialog-error">Deleting this file can break imports that use it.</p>
          )}
          {error && (
            <p className="k-dialog-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="k-dialog-footer k-dialog-footer--spread">
          {!isProtected &&
            (confirmingDelete ? (
              <Button use="danger" size="small" icon={<Trash2 size={14} />} onClick={onDelete}>
                Delete permanently
              </Button>
            ) : (
              <Button
                use="text"
                size="small"
                icon={<Trash2 size={14} />}
                onClick={() => {
                  setConfirmingDelete(true);
                  setError("");
                }}
              >
                Delete
              </Button>
            ))}
          <span className="k-dialog-spacer" />
          <Button use="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button use="accent" type="submit" disabled={isProtected || !draft.trim()}>
            Save changes
          </Button>
        </footer>
      </form>
    </KonturDialog>
  );
}
