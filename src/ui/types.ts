export type Device = "desktop" | "tablet" | "mobile";
export type Tab = "preview" | "code";

export type FileEntry = { name: string; language: string; value: string };
export type Page = { path: string; label: string };
export type Message = { role: "user" | "assistant" | "error"; text: string };

export type EditorAction = {
  type: string;
  label?: string;
  path?: string;
  newPath?: string;
  name?: string;
  newName?: string;
  theme?: string;
  device?: string;
  tab?: string;
  direction?: string;
  content?: string;
  enabled?: boolean;
};

export type EditorSnapshot = {
  files: FileEntry[];
  pages: Page[];
  startRoute: string;
  afterSubmit: string;
  route: string;
  activeFile: string;
  tab: Tab;
  device: Device;
  outlines: boolean;
};

export type EditorResult = EditorSnapshot & {
  theme?: "light" | "dark";
  restart: boolean;
  notes: string[];
};
