import { Hint } from "@skbkontur/react-ui";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  Monitor,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Tablet,
} from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { PAGE_PATH } from "../lib/pages";
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
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onNavigate?: (route: string) => void;
  onCopyLink?: () => Promise<boolean>;
  onToggleTheme?: () => void;
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
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  onNavigate,
  onCopyLink,
  onToggleTheme,
  onDevice,
  onReload,
  onDismissErrors,
}: PreviewCanvasProps) {
  const [viewport, setViewport] = useState("");
  const [draft, setDraft] = useState(route);
  const [invalid, setInvalid] = useState(false);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    setDraft(route);
    setInvalid(false);
  }, [route]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function submitAddress(event: React.FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    const next = value.startsWith("/") ? value : `/${value}`;
    if (!PAGE_PATH.test(next)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onNavigate?.(next);
  }

  async function copyLink() {
    try {
      if (onCopyLink) {
        setCopied(await onCopyLink());
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="canvas">
      <div className="canvas-addressbar">
        <div className="address-nav">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            onClick={onForward}
            disabled={!canGoForward}
            title="Forward"
            aria-label="Forward"
          >
            <ArrowRight size={14} />
          </button>
          <button type="button" onClick={onReload} title="Reload" aria-label="Reload preview">
            <RotateCcw size={14} />
          </button>
        </div>
        <form
          className={`address-field ${invalid ? "invalid" : ""}`}
          onSubmit={submitAddress}
          title="Prototype path"
        >
          <span className="address-origin">playui.dev</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Prototype path"
            spellCheck={false}
          />
        </form>
      </div>

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
        {onToggleTheme && (
          <Hint
            text={isDark ? "Switch to light preview" : "Switch to dark preview"}
            delayBeforeShow={250}
            useWrapper
          >
            <button
              type="button"
              className="icon-button"
              aria-label={isDark ? "Switch to light preview" : "Switch to dark preview"}
              onClick={onToggleTheme}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </Hint>
        )}
        <Hint text={copied ? "Copied" : "Copy prototype link"} delayBeforeShow={250} useWrapper>
          <button
            type="button"
            className="icon-button"
            aria-label={copied ? "Copied" : "Copy prototype link"}
            onClick={() => void copyLink()}
          >
            {copied ? <Check size={15} /> : <Link2 size={15} />}
          </button>
        </Hint>
      </div>
    </div>
  );
}
