import { Dialog } from "../Dialog";

const GROUPS = [
  {
    title: "General",
    rows: [
      ["⌘ K", "Search and commands"],
      ["?", "Keyboard shortcuts"],
      ["N", "New prototype"],
    ],
  },
  {
    title: "Workspace",
    rows: [
      ["V", "Preview"],
      ["C", "Code"],
      ["R", "Reload preview"],
    ],
  },
  {
    title: "Projects",
    rows: [
      ["⌘ A", "Select all prototypes"],
      ["Delete", "Delete selected"],
      ["Esc", "Clear selection"],
    ],
  },
  {
    title: "Tabs and page bar",
    rows: [
      ["← →", "Move between tabs"],
      ["Double-click", "Rename tab"],
      ["Right-click", "Tab menu"],
      ["Middle-click", "Close tab"],
      ["↑ ↓ / Enter", "Address bar suggestions"],
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <div className="shortcut-groups">
        {GROUPS.map((group) => (
          <section key={group.title} className="shortcut-group">
            <h3>{group.title}</h3>
            {group.rows.map(([keys, label]) => (
              <div key={keys} className="shortcut-row">
                <span>{label}</span>
                <kbd>{keys}</kbd>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Dialog>
  );
}
