import { lazy, Suspense } from "react";
import { FolderOpen, Settings2 } from "lucide-react";
import { FileIcon } from "../FileIcon";
import type { FileEntry } from "../types";

const Editor = lazy(() => import("../CodeEditor"));

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  lineHeight: 19,
  fontFamily: "Menlo, Monaco, Consolas, monospace",
  padding: { top: 18 },
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  automaticLayout: true,
  renderLineHighlight: "line" as const,
  bracketPairColorization: { enabled: true },
  guides: { indentation: true, bracketPairs: true },
  stickyScroll: { enabled: true },
  tabSize: 2,
};

function languageLabel(language: string): string {
  if (language === "css") return "CSS";
  if (language === "json") return "JSON";
  return "TypeScript";
}

type EditorPaneProps = {
  files: FileEntry[];
  activeFile: string;
  projectPath: string;
  declarations: { name: string; value: string }[];
  onFileChange: (value: string | undefined) => void;
  onOpenFiles: () => void;
  onOpenSettings: () => void;
};

export function EditorPane({
  files,
  activeFile,
  projectPath,
  declarations,
  onFileChange,
  onOpenFiles,
  onOpenSettings,
}: EditorPaneProps) {
  const currentFile = files.find((file) => file.name === activeFile) ?? files[0]!;

  return (
    <div className="code-workspace">
      <div className="editor-bar">
        <FileIcon name={activeFile} />
        <span className="editor-file-name">{activeFile}</span>
        <span className="editor-bar-hint">{languageLabel(currentFile.language)}</span>
        <button
          type="button"
          className="editor-action"
          aria-label="All files"
          title="All files"
          onClick={onOpenFiles}
        >
          <FolderOpen size={14} />
        </button>
        <button
          type="button"
          className="editor-action"
          aria-label="File settings"
          title="File settings"
          onClick={onOpenSettings}
        >
          <Settings2 size={14} />
        </button>
      </div>
      <div className="editor-wrap">
        <Suspense fallback={<p className="editor-loading">Loading editor…</p>}>
          <Editor
            height="100%"
            path={`${projectPath}/${activeFile}`}
            projectPath={projectPath}
            declarations={declarations}
            keepCurrentModel
            language={currentFile.language}
            value={currentFile.value}
            onChange={onFileChange}
            theme="vs"
            options={EDITOR_OPTIONS}
          />
        </Suspense>
      </div>
    </div>
  );
}
