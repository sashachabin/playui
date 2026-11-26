import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type Command = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

export type CommandPaletteProps = {
  commands: Command[];
  onClose: () => void;
};

export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const filtered = commands
    .filter((command) =>
      `${command.label} ${command.group} ${command.hint ?? ""} ${command.keywords ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .slice(0, 50);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-command-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function run(command: Command) {
    onClose();
    command.run();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((current) => (filtered.length === 0 ? 0 : (current + 1) % filtered.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((current) =>
        filtered.length === 0 ? 0 : (current - 1 + filtered.length) % filtered.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = filtered[selected];
      if (command) run(command);
    }
  }

  let group = "";
  return (
    <div className="command-backdrop" onPointerDown={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, files and actions…"
            aria-label="Search pages, files and actions"
            aria-controls="command-results"
            aria-activedescendant={
              filtered[selected] ? `command-${filtered[selected].id}` : undefined
            }
          />
          <kbd>esc</kbd>
        </div>
        <div className="command-results" id="command-results" role="listbox" ref={list}>
          {filtered.map((command, index) => {
            const heading = command.group !== group ? command.group : "";
            group = command.group;
            return (
              <div key={command.id}>
                {heading && <div className="command-group">{heading}</div>}
                <button
                  id={`command-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === selected}
                  data-command-index={index}
                  className={`command-item ${index === selected ? "active" : ""}`}
                  onPointerMove={() => setSelected(index)}
                  onClick={() => run(command)}
                >
                  <span className="command-label">{command.label}</span>
                  {command.hint && <span className="command-hint">{command.hint}</span>}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="command-empty">Nothing found.</div>}
        </div>
        <footer className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>⌘K</kbd> toggle
          </span>
        </footer>
      </div>
    </div>
  );
}
