import { Button, Hint, Input } from "@skbkontur/react-ui";
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
import { useEffect, useRef, useState } from "react";
import type { PreviewCanvasProps } from "../components/PreviewCanvas";
import { PAGE_PATH } from "../lib/pages";
import type { Device } from "../types";

const DEVICES = [
  ["desktop", "Desktop", Monitor],
  ["tablet", "Tablet", Tablet],
  ["mobile", "Mobile", Smartphone],
] as const;

export function KonturPreviewCanvas({
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
    <div className="canvas k-canvas">
      <div className="k-addressbar">
        <div className="k-address-nav">
          <Button
            use="text"
            size="small"
            icon={<ArrowLeft size={14} />}
            onClick={onBack}
            disabled={!canGoBack}
            title="Back"
            aria-label="Back"
          />
          <Button
            use="text"
            size="small"
            icon={<ArrowRight size={14} />}
            onClick={onForward}
            disabled={!canGoForward}
            title="Forward"
            aria-label="Forward"
          />
          <Button
            use="text"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={onReload}
            title="Reload"
            aria-label="Reload preview"
          />
        </div>
        <form
          ref={address}
          className={`k-address-field ${invalid ? "is-invalid" : ""}`}
          onSubmit={submitAddress}
          title="Prototype path"
        >
          <span className="k-address-origin">playui.dev</span>
          <Input
            width="100%"
            size="small"
            borderless
            value={draft}
            aria-label="Prototype path"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="k-address-suggestions"
            spellCheck={false}
            onValueChange={(value) => {
              setDraft(value);
              setInvalid(false);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.form?.contains(event.relatedTarget as Node)) {
                setSuggestionsOpen(false);
              }
            }}
            onKeyDown={addressKeyDown}
          />
          {suggestionsOpen && suggestions.length > 0 && (
            <div className="k-address-suggestions" id="k-address-suggestions" role="listbox">
              <div className="k-address-suggestions-label">Pages</div>
              {suggestions.map((page, index) => (
                <button
                  key={page.path}
                  type="button"
                  role="option"
                  aria-selected={index === suggestionIndex}
                  className={`k-address-suggestion ${index === suggestionIndex ? "is-active" : ""}`}
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
        <div className="k-canvas-error" role="alert">
          <AlertTriangle size={17} />
          <div className="k-canvas-error-body">
            <strong>{runtimeError ? "The preview crashed" : "This code does not compile"}</strong>
            <pre>{runtimeError || buildError}</pre>
          </div>
          <Button use="text" size="small" onClick={onDismissErrors}>
            Dismiss
          </Button>
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

      <div className="k-canvas-toolbar">
        {onUndo && onRedo && (
          <>
            <Button
              use="text"
              size="small"
              icon={<Undo2 size={15} />}
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!canUndo}
              onClick={onUndo}
            />
            <Button
              use="text"
              size="small"
              icon={<Redo2 size={15} />}
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              disabled={!canRedo}
              onClick={onRedo}
            />
            <span className="k-toolbar-sep" />
          </>
        )}
        <div className="k-device-switch" role="group" aria-label="Preview size">
          {DEVICES.map(([value, label, Icon]) => (
            <Button
              key={value}
              use="text"
              size="small"
              active={device === value}
              icon={<Icon size={14} />}
              aria-label={label}
              aria-pressed={device === value}
              title={label}
              onClick={() => onDevice(value as Device)}
            >
              <span className="k-device-label">{label}</span>
            </Button>
          ))}
        </div>
        <span className="k-toolbar-sep" />
        {onToggleTheme && (
          <Hint
            text={isDark ? "Switch to light preview" : "Switch to dark preview"}
            delayBeforeShow={250}
            useWrapper
          >
            <Button
              use="text"
              size="small"
              icon={isDark ? <Sun size={15} /> : <Moon size={15} />}
              title={isDark ? "Switch to light preview" : "Switch to dark preview"}
              aria-label={isDark ? "Switch to light preview" : "Switch to dark preview"}
              onClick={onToggleTheme}
            />
          </Hint>
        )}
        <Hint text={copied ? "Copied" : "Copy prototype link"} delayBeforeShow={250} useWrapper>
          <Button
            use="text"
            size="small"
            icon={copied ? <Check size={15} /> : <Link2 size={15} />}
            title={copied ? "Copied" : "Copy prototype link"}
            aria-label={copied ? "Copied" : "Copy prototype link"}
            onClick={() => void copyLink()}
          />
        </Hint>
      </div>
    </div>
  );
}
