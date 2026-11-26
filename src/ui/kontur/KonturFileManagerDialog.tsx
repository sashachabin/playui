import { Button, Input } from "@skbkontur/react-ui";
import { FilePlus2, Search, Settings2 } from "lucide-react";
import { useState } from "react";
import type { FileManagerDialogProps } from "../components/FileManagerDialog";
import { FileIcon } from "../FileIcon";
import { fileKindLabel, formatFileSize } from "../lib/files";
import { KonturDialog } from "./Dialog";

export function KonturFileManagerDialog({
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
    <KonturDialog title="Project files" onClose={onClose} width={600}>
      <div className="k-modal-toolbar">
        <Input
          autoFocus
          width="100%"
          leftIcon={<Search size={14} />}
          value={search}
          onValueChange={setSearch}
          placeholder="Search files"
          aria-label="Search files"
        />
        <Button use="accent" size="small" icon={<FilePlus2 size={14} />} onClick={onCreate}>
          New file
        </Button>
      </div>
      <div className="k-file-manager" role="list">
        {visibleFiles.map((file) => (
          <div className="k-file-manager-row" role="listitem" key={file.name}>
            <button type="button" className="k-file-manager-open" onClick={() => onOpen(file.name)}>
              <FileIcon name={file.name} />
              <span className="k-file-manager-name">{file.name}</span>
              <span className="k-file-manager-meta">
                {fileKindLabel(file.name)} · {formatFileSize(file.value)}
              </span>
            </button>
            <Button
              use="text"
              size="small"
              icon={<Settings2 size={14} />}
              aria-label={`Settings for ${file.name}`}
              title="File settings"
              onClick={() => onOpenSettings(file.name)}
            />
          </div>
        ))}
        {visibleFiles.length === 0 && (
          <p className="k-file-manager-empty">No files match “{search}”.</p>
        )}
      </div>
    </KonturDialog>
  );
}
