import type { FileEntry } from "../types";

export function parseConfig(files: FileEntry[]): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(
      files.find((file) => file.name === "playui.config.json")?.value ?? "{}",
    );
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // A draft may contain unfinished JSON.
  }
  return undefined;
}

export function projectTitle(files: FileEntry[], index: number): string {
  const name = parseConfig(files)?.name;
  return typeof name === "string" && name.trim() ? name.trim() : `Prototype ${index + 1}`;
}

export function writeConfig(files: FileEntry[], changes: Record<string, unknown>): FileEntry[] {
  return files.map((file) => {
    if (file.name !== "playui.config.json") return file;
    let base: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(file.value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        base = parsed as Record<string, unknown>;
      }
    } catch {
      // Repair an unfinished config while applying the change.
    }
    return { ...file, value: JSON.stringify({ ...base, ...changes }, null, 2) };
  });
}

const DESIGN_SYSTEM_LABELS: Record<string, string> = {
  "@skbkontur/react-ui": "Kontur UI",
  antd: "Ant Design",
  "@mui/material": "MUI",
  "@chakra-ui/react": "Chakra UI",
};

export function designSystemLabel(value: unknown): string {
  return typeof value === "string" ? (DESIGN_SYSTEM_LABELS[value] ?? value) : "Custom";
}

export function newProjectId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return random.replace(/-/g, "").slice(0, 8);
}

export function projectId(files: FileEntry[]): string | undefined {
  const id = parseConfig(files)?.id;
  return typeof id === "string" && /^[a-z0-9-]{4,40}$/i.test(id) ? id : undefined;
}

export function withProjectId(files: FileEntry[]): FileEntry[] {
  return projectId(files) ? files : writeConfig(files, { id: newProjectId() });
}
