import { KonturDialog } from "./Dialog";

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
      ["⌘ Z", "Undo"],
      ["⇧ ⌘ Z", "Redo"],
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
      ["Tab menu", "Rename, close, close others"],
      ["Middle-click", "Close tab"],
      ["↑ ↓ / Enter", "Address bar suggestions"],
    ],
  },
];

export function KonturShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <KonturDialog title="Keyboard shortcuts" onClose={onClose} width={640}>
      <div className="k-shortcut-groups">
        {GROUPS.map((group) => (
          <section key={group.title} className="k-shortcut-group">
            <h3>{group.title}</h3>
            {group.rows.map(([keys, label]) => (
              <div key={keys} className="k-shortcut-row">
                <span>{label}</span>
                <kbd>{keys}</kbd>
              </div>
            ))}
          </section>
        ))}
      </div>
    </KonturDialog>
  );
}
