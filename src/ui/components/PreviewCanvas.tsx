import { Hint } from "@skbkontur/react-ui";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  Monitor,
  Moon,
  Redo2,
  RotateCcw,
  Smartphone,
  Sun,
  Tablet,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
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
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleTheme?: () => void;
  routes?: { path: string; label: string }[];
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
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onToggleTheme,
  routes = [],
  onDevice,
  onReload,
  onDismissErrors,
}: PreviewCanvasProps) {
  const [viewport, setViewport] = useState("");
  const [draft, setDraft] = useState(route);
  const [invalid, setInvalid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const address = useRef<HTMLFormElement>(null);

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

  const query = draft.trim().replace(/^\//, "").toLowerCase();
  const suggestions = routes
    .filter(
      (page) =>
        !query ||
        page.path.replace(/^\//, "").toLowerCase().includes(query) ||
        page.label.toLowerCase().includes(query),
    )
    .slice(0, 8);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [draft]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    function dismiss(event: PointerEvent) {
      if (!address.current?.contains(event.target as Node)) setSuggestionsOpen(false);
    }
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [suggestionsOpen]);

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
    setSuggestionsOpen(false);
    onNavigate?.(next);
  }

  function chooseSuggestion(path: string) {
    setDraft(path);
    setInvalid(false);
    setSuggestionsOpen(false);
    onNavigate?.(path);
  }

  function addressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setSuggestionsOpen(true);
      setSuggestionIndex((current) => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        return (current + direction + suggestions.length) % suggestions.length;
      });
      return;
    }
    if (event.key === "Enter" && suggestionsOpen && suggestions[suggestionIndex]) {
      event.preventDefault();
      chooseSuggestion(suggestions[suggestionIndex].path);
    }
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
          ref={address}
          className={`address-field ${invalid ? "invalid" : ""}`}
          onSubmit={submitAddress}
          title="Prototype path"
        >
          <span className="address-origin">playui.dev</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.form?.contains(event.relatedTarget as Node)) {
                setSuggestionsOpen(false);
              }
            }}
            onKeyDown={addressKeyDown}
            aria-label="Prototype path"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="address-suggestions"
            aria-activedescendant={
              suggestionsOpen && suggestions[suggestionIndex]
                ? `address-suggestion-${suggestionIndex}`
                : undefined
            }
            spellCheck={false}
          />
          {suggestionsOpen && suggestions.length > 0 && (
            <div className="address-suggestions" id="address-suggestions" role="listbox">
              <div className="address-suggestions-label">Pages</div>
              {suggestions.map((page, index) => (
                <button
                  key={page.path}
                  id={`address-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === suggestionIndex}
                  className={`address-suggestion ${index === suggestionIndex ? "active" : ""}`}
                  onPointerMove={() => setSuggestionIndex(index)}
                  onClick={() => chooseSuggestion(page.path)}
                >
                  <span>{page.label}</span>
                  <small>{page.path}</small>
                </button>
              ))}
            </div>
          )}
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
        {onUndo && onRedo && (
          <>
            <button
              type="button"
              className="icon-button"
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 size={15} />
            </button>
            <span className="toolbar-sep" />
          </>
        )}
        <div className="device-switch" role="group" aria-label="Preview size">
          {DEVICES.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={device === value ? "active" : ""}
              aria-label={label}
              aria-pressed={device === value}
              title={label}
              onClick={() => onDevice(value)}
            >
              <Icon size={14} />
              <span className="device-label">{label}</span>
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
