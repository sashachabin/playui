import { useEffect, useState, type RefObject } from "react";
import { Hint } from "@skbkontur/react-ui";
import { AlertTriangle, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import type { Device } from "../types";

const DEVICES = [
  ["desktop", "Desktop", Monitor],
  ["tablet", "Tablet", Tablet],
  ["mobile", "Mobile", Smartphone],
] as const;

type PreviewCanvasProps = {
  preview: string;
  device: Device;
  isDark: boolean;
  route: string;
  screenLabel: string;
  buildError: string;
  runtimeError: string;
  revision: number;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onDevice: (device: Device) => void;
  onReload: () => void;
  onDismissErrors: () => void;
};

export function PreviewCanvas({
  preview,
  device,
  isDark,
  route,
  screenLabel,
  buildError,
  runtimeError,
  revision,
  frameRef,
  onDevice,
  onReload,
  onDismissErrors,
}: PreviewCanvasProps) {
  const [viewport, setViewport] = useState("");

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewport(`${Math.round(width)} × ${Math.round(height)}`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [frameRef, revision]);

  return (
    <div className="canvas">
      {(buildError || runtimeError) && (
        <div className="canvas-error" role="alert">
          <AlertTriangle size={17} />
          <div className="canvas-error-body">
            <strong>{runtimeError ? "The preview crashed" : "This code does not compile"}</strong>
            <pre>{runtimeError || buildError}</pre>
          </div>
          <button type="button" className="canvas-error-dismiss" onClick={onDismissErrors}>
            Dismiss
          </button>
        </div>
      )}

      <div className="device-stage">
        <div className={`device-shell ${device}`}>
          <div className="frame-label">
            <span className="frame-name">{screenLabel}</span>
            <span className="frame-path">{route}</span>
            <span className="frame-size">{viewport} px</span>
          </div>
          <div className={`device-frame ${device} ${isDark ? "dark" : ""}`}>
            <iframe
              ref={frameRef}
              sandbox="allow-scripts allow-forms"
              key={revision}
              title="Interactive prototype preview"
              srcDoc={preview}
            />
          </div>
        </div>
      </div>

      <div className="canvas-toolbar">
        <div className="device-switch" role="group" aria-label="Preview size">
          {DEVICES.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={device === value ? "active" : ""}
              aria-pressed={device === value}
              onClick={() => onDevice(value)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <span className="toolbar-sep" />
        <Hint text="Reload preview" delayBeforeShow={250} useWrapper>
          <button
            type="button"
            className="icon-button"
            aria-label="Reload preview"
            onClick={onReload}
          >
            <RotateCcw size={15} />
          </button>
        </Hint>
      </div>
    </div>
  );
}
