const FILE_PATH = /^(?:[\w-]+\/)*[\w.-]+\.(?:tsx?|jsx?|css|json)$/;
const MAX_FILE_CHARS = 200_000;
const MAX_TOTAL_CHARS = 500_000;
const MAX_FILES = 50;
const MAX_ACTIONS = 20;

const ACTION_TYPES = new Set([
  "add_page",
  "rename_page",
  "delete_page",
  "move_page",
  "set_start_page",
  "set_after_submit",
  "navigate",
  "set_theme",
  "set_device",
  "set_tab",
  "set_outlines",
  "add_file",
  "rename_file",
  "delete_file",
  "open_file",
  "restart_flow",
]);

const ACTION_STRING_FIELDS = [
  "label",
  "path",
  "newPath",
  "name",
  "newName",
  "theme",
  "device",
  "tab",
  "direction",
  "content",
] as const;

export type ModelAction = {
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

export type ModelResponse = {
  text: string;
  files: Record<string, string>;
  actions: ModelAction[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readActions(value: unknown): ModelAction[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('The response "actions" must be an array.');
  if (value.length > MAX_ACTIONS) throw new Error("The response has too many actions.");

  const actions: ModelAction[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.type !== "string") {
      throw new Error("Every action must be an object with a string type.");
    }
    if (!ACTION_TYPES.has(entry.type)) {
      throw new Error(`Unknown action "${entry.type.slice(0, 60)}".`);
    }
    const action: ModelAction = { type: entry.type };
    for (const field of ACTION_STRING_FIELDS) {
      if (entry[field] === undefined) continue;
      if (typeof entry[field] !== "string") {
        throw new Error(`Action ${entry.type} has a non-string "${field}".`);
      }
      action[field] = entry[field];
    }
    if (entry.enabled !== undefined) {
      if (typeof entry.enabled !== "boolean") {
        throw new Error(`Action ${entry.type} has a non-boolean "enabled".`);
      }
      action.enabled = entry.enabled;
    }
    actions.push(action);
  }
  return actions;
}

/**
 * The model returns files as an array or (from older prompts) as an object map.
 * Everything that reaches the client goes through this function.
 */
export function parseModelResponse(raw: string | undefined): ModelResponse {
  if (!raw?.trim()) throw new Error("The model returned an empty response.");

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The model returned malformed JSON.");
  }
  if (!isRecord(value)) throw new Error("The model response must be a JSON object.");

  const files: Record<string, string> = {};
  let total = 0;

  const addFile = (name: unknown, content: unknown) => {
    if (typeof name !== "string" || !FILE_PATH.test(name)) {
      throw new Error(`Invalid file name in the model response: ${String(name).slice(0, 80)}`);
    }
    if (Object.hasOwn(files, name)) {
      throw new Error(`Duplicate file in the model response: ${name}`);
    }
    if (typeof content !== "string") throw new Error(`File ${name} has no string content.`);
    if (!content.trim()) throw new Error(`File ${name} is empty; return its complete contents.`);
    if (content.length > MAX_FILE_CHARS) throw new Error(`File ${name} is too large.`);
    total += content.length;
    if (total > MAX_TOTAL_CHARS) throw new Error("The model response contains too much code.");
    if (Object.keys(files).length >= MAX_FILES) {
      throw new Error("The model response has too many files.");
    }
    files[name] = content;
  };

  const rawFiles = value.files;
  if (Array.isArray(rawFiles)) {
    for (const entry of rawFiles) {
      if (!isRecord(entry)) throw new Error("Each file in the model response must be an object.");
      addFile(entry.name, entry.content);
    }
  } else if (isRecord(rawFiles)) {
    for (const [name, content] of Object.entries(rawFiles)) addFile(name, content);
  } else if (rawFiles !== undefined) {
    throw new Error('The model response "files" must be an array.');
  }

  const actions = readActions(value.actions);
  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text && Object.keys(files).length === 0 && actions.length === 0) {
    throw new Error("The model response contains no text, files or actions.");
  }

  return {
    text: text || (actions.length > 0 ? "Done." : "Updated the prototype."),
    files,
    actions,
  };
}
