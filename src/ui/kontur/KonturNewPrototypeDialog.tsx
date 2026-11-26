import { Button } from "@skbkontur/react-ui";
import { ChevronRight } from "lucide-react";
import type { NewPrototypeDialogProps } from "../components/NewPrototypeDialog";
import { templates } from "../data";
import { DesignSystemIcon } from "../DesignSystemIcon";
import { KonturDialog } from "./Dialog";

export function KonturNewPrototypeDialog({ onClose, onCreate }: NewPrototypeDialogProps) {
  return (
    <KonturDialog title="New prototype" onClose={onClose} width={560}>
      <div className="k-template-picker">
        {templates.map((template) => (
          <button
            key={`${template.name}-${template.systemLabel}`}
            type="button"
            className="k-template-card"
            onClick={() => onCreate(template)}
          >
            <DesignSystemIcon system={template.system} />
            <span className="k-template-body">
              <span className="k-template-title">{template.name}</span>
              <span className="k-template-description">{template.description}</span>
              <span className="k-template-meta">
                {template.systemLabel} · {template.route}
              </span>
            </span>
            <ChevronRight size={16} className="k-template-arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
      <footer className="k-dialog-footer">
        <Button use="outline" onClick={onClose}>
          Cancel
        </Button>
      </footer>
    </KonturDialog>
  );
}
