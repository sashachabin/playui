import { ChevronRight } from "lucide-react";
import { Dialog } from "../Dialog";
import { DesignSystemIcon } from "../DesignSystemIcon";
import { templates } from "../data";

type Template = (typeof templates)[number];

type NewPrototypeDialogProps = {
  onClose: () => void;
  onCreate: (template: Template) => void;
};

export function NewPrototypeDialog({ onClose, onCreate }: NewPrototypeDialogProps) {
  return (
    <Dialog title="New prototype" onClose={onClose}>
      <div className="template-picker">
        {templates.map((template, index) => (
          <button
            key={`${template.name}-${template.systemLabel}`}
            type="button"
            className="template-card"
            autoFocus={index === 0}
            onClick={() => onCreate(template)}
          >
            <DesignSystemIcon system={template.system} />
            <span className="template-body">
              <span className="template-title">{template.name}</span>
              <span className="template-description">{template.description}</span>
              <span className="template-meta">
                {template.systemLabel} · {template.route}
              </span>
            </span>
            <ChevronRight size={16} className="template-arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
      <footer className="modal-footer">
        <span className="modal-spacer" />
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </footer>
    </Dialog>
  );
}
