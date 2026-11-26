export type ShareToastProps = {
  state: "idle" | "copying" | "copied" | "error";
};

export function ShareToast({ state }: ShareToastProps) {
  if (state === "copied") {
    return (
      <div className="toast" role="status">
        Share link copied
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="toast toast-error" role="alert">
        Could not copy the share link
      </div>
    );
  }
  return null;
}
