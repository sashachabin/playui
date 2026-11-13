import { FileCode2 } from "lucide-react";

const FILE_LABELS: Record<string, string> = {
  ts: "TS",
  js: "JS",
  css: "CSS",
  json: "{}",
  md: "MD",
};

function ReactMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function FileIcon({ name }: { name: string }) {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  if (extension === "tsx" || extension === "jsx") {
    return (
      <span className="file-ext file-ext--react" aria-hidden="true">
        <ReactMark />
      </span>
    );
  }
  const label = FILE_LABELS[extension];
  if (!label) return <FileCode2 size={15} aria-hidden="true" />;
  return (
    <span className={`file-ext file-ext--${extension}`} aria-hidden="true">
      {label}
    </span>
  );
}
