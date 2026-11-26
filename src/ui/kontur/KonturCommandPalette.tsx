import { Input, MenuItem, Modal } from "@skbkontur/react-ui";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Command, CommandPaletteProps } from "../components/CommandPalette";

export function KonturCommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  const filtered = commands
    .filter((command) =>
      `${command.label} ${command.group} ${command.hint ?? ""} ${command.keywords ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .slice(0, 50);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`#k-command-${selected}`)
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
    <Modal
      width={640}
      alignTop
      noClose
      onClose={onClose}
      className="k-modal k-palette-modal"
      aria-label="Search and commands"
    >
      <Modal.Body>
        <div className="k-palette" role="dialog" aria-modal="true" aria-label="Search and commands">
          <div className="k-palette-search">
            <Search size={16} aria-hidden="true" />
            <Input
              autoFocus
              width="100%"
              borderless
              value={query}
              onValueChange={setQuery}
              onKeyDown={onKeyDown}
              placeholder="Search pages, files and actions…"
              aria-label="Search pages, files and actions"
              aria-controls="k-command-results"
            />
            <kbd>esc</kbd>
          </div>
          <div className="k-palette-results" id="k-command-results" role="listbox" ref={list}>
            {filtered.map((command, index) => {
              const heading = command.group !== group ? command.group : "";
              group = command.group;
              return (
                <div key={command.id} className="k-palette-group-wrap">
                  {heading && <div className="k-palette-group">{heading}</div>}
                  <MenuItem
                    id={`k-command-${index}`}
                    role="option"
                    aria-selected={index === selected}
                    state={index === selected ? "hover" : null}
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => run(command)}
                  >
                    <span className="k-palette-item">
                      <span>{command.label}</span>
                      {command.hint && <span className="k-palette-hint">{command.hint}</span>}
                    </span>
                  </MenuItem>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="k-palette-empty">Nothing found.</div>}
          </div>
          <footer className="k-palette-footer">
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
      </Modal.Body>
    </Modal>
  );
}
