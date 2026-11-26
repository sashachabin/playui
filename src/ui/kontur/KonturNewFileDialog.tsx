import { Button, Input } from "@skbkontur/react-ui";
import { useState } from "react";
import type { NewFileDialogProps } from "../components/NewFileDialog";
import { FileIcon } from "../FileIcon";
import { fileKindLabel, normalizeFilePath } from "../lib/files";
import { KonturDialog } from "./Dialog";

export function KonturNewFileDialog({ files, onClose, onCreate }: NewFileDialogProps) {
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
    <KonturDialog title="New file" onClose={onClose} width={500}>
      <form className="k-dialog-form" onSubmit={submit}>
        <div className="k-dialog-body">
          <label className="k-field">
            <span>File name</span>
            <Input
              autoFocus
              width="100%"
              value={name}
              spellCheck={false}
              placeholder="components/Button.tsx"
              onValueChange={(value) => {
                setName(value);
                setError("");
              }}
            />
          </label>
          <div className="k-dialog-file-preview">
            <FileIcon name={name || "untitled"} />
            <span>{name ? fileKindLabel(name) : "Type follows the extension"}</span>
          </div>
          <p className="k-field-hint">
            Use .tsx, .ts, .css or .json. Folders are allowed. Starter content is added
            automatically.
          </p>
          {error && (
            <p className="k-dialog-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="k-dialog-footer">
          <Button use="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button use="accent" type="submit" disabled={!name.trim()}>
            Create file
          </Button>
        </footer>
      </form>
    </KonturDialog>
  );
}
