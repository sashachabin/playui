import { Toast } from "@skbkontur/react-ui";
import { useEffect, useRef } from "react";
import type { ShareToastProps } from "../components/ShareToast";

export function KonturShareToast({ state }: ShareToastProps) {
  const toast = useRef<Toast>(null);

  useEffect(() => {
    if (state === "copied") toast.current?.push("Share link copied");
    if (state === "error") {
      toast.current?.push("Could not copy the share link", { use: "error" });
    }
  }, [state]);

  return <Toast ref={toast} />;
}
