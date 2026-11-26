import { Modal } from "@skbkontur/react-ui";
import type { ReactNode } from "react";

export type KonturDialogProps = {
  title: string;
  onClose: () => void;
  width?: number | string;
  children: ReactNode;
};

/** Kontur UI modal used by the Kontur edition of the app. */
export function KonturDialog({ title, onClose, width = 560, children }: KonturDialogProps) {
  return (
    <Modal
      width={width}
      onClose={onClose}
      className="k-modal"
      aria-label={title}
      mobileAppearance="auto"
    >
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>{children}</Modal.Body>
    </Modal>
  );
}
