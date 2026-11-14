import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const modal = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      [
        ...(modal.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) ?? []),
      ].filter((element) => element.getClientRects().length);
    if (!modal.current?.contains(document.activeElement)) focusable()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section ref={modal} className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
