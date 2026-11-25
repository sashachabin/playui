import { useEffect, useMemo, useRef, useState } from "react";
import type { compilePreview } from "../preview/compile";
import { Logo } from "./Logo";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { parseConfig } from "./lib/config";
import { PAGE_PATH } from "./lib/pages";
import type { SharedProject } from "./lib/share";
import { buildShareHash } from "./lib/url";
import type { Device } from "./types";

type SharedViewProps = {
  project: SharedProject;
  payload: string;
  initialPage: string;
  initialDevice: Device;
  initialTheme?: "light" | "dark";
};

export function SharedView({
  project,
  payload,
  initialPage,
  initialDevice,
  initialTheme,
}: SharedViewProps) {
  const config = parseConfig(project.files);
  const startRoute =
    typeof config?.startRoute === "string" &&
    project.pages.some((page) => page.path === config.startRoute)
      ? config.startRoute
      : (project.pages[0]?.path ?? "/");
  const locale = typeof config?.locale === "string" ? config.locale : "en-US";
  const afterSubmit =
    typeof config?.afterSubmit === "string" &&
    project.pages.some((page) => page.path === config.afterSubmit)
      ? config.afterSubmit
      : "";
  const isDark = initialTheme ? initialTheme === "dark" : config?.theme === "dark";

  const [route, setRoute] = useState(PAGE_PATH.test(initialPage) ? initialPage : startRoute);
  const [device, setDevice] = useState<Device>(initialDevice);
  const [revision, setRevision] = useState(0);
  const [compiled, setCompiled] = useState<{
    bundle: Awaited<ReturnType<typeof compilePreview>>;
    document: typeof import("../preview/compile").previewDocument;
  }>();
  const [buildError, setBuildError] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let stale = false;
    const timeout = window.setTimeout(async () => {
      try {
        const runtime = await import("../preview/compile");
        const bundle = await runtime.compilePreview(
          Object.fromEntries(project.files.map((file) => [file.name, file.value])),
        );
        if (stale) return;
        setCompiled({ bundle, document: runtime.previewDocument });
        setBuildError("");
        setRuntimeError("");
      } catch (error) {
        if (!stale) setBuildError(error instanceof Error ? error.message : String(error));
      }
    }, 160);
    return () => {
      stale = true;
      window.clearTimeout(timeout);
    };
  }, [project.files]);

  const preview = useMemo(
    () =>
      compiled?.document(compiled.bundle, {
        route,
        dark: isDark,
        locale,
        outlines: false,
        afterSubmit,
      }),
    [compiled, route, isDark, locale, afterSubmit],
  );

  useEffect(() => {
    function navigate(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const path: unknown = event.data?.route;
      if (typeof path === "string" && PAGE_PATH.test(path)) setRoute(path);
      if (typeof event.data?.error === "string") setRuntimeError(event.data.error);
    }
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  }, []);

  useEffect(() => {
    const hash = buildShareHash(payload, { page: route, device, theme: isDark ? "dark" : "light" });
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }, [payload, route, device, isDark]);

  const screenLabel = project.pages.find((page) => page.path === route)?.label ?? "Custom screen";

  return (
    <main className="shared">
      <header className="shared-header">
        <div className="brand" aria-label="PlayUI">
          <span className="brand-mark" aria-hidden="true">
            <Logo />
          </span>
          <span className="brand-name">PlayUI</span>
        </div>
        <span className="shared-divider" aria-hidden="true" />
        <span className="shared-title">{project.title}</span>
        <span className="shared-badge">Prototype</span>
        <span className="shared-spacer" />
        <a className="shared-back" href="#/">
          Open PlayUI
        </a>
      </header>
      <div className="shared-body">
        <aside className="shared-pages" aria-label="Prototype pages">
          <div className="shared-pages-heading">Pages</div>
          <div className="shared-page-list">
            {project.pages.map((page) => (
              <button
                key={page.path}
                type="button"
                className={`shared-page ${page.path === route ? "active" : ""}`}
                onClick={() => setRoute(page.path)}
              >
                <span>{page.label}</span>
                <small>{page.path}</small>
              </button>
            ))}
          </div>
        </aside>
        <section className="shared-canvas">
          <PreviewCanvas
            preview={preview ?? ""}
            device={device}
            isDark={isDark}
            route={route}
            screenLabel={screenLabel}
            buildError={buildError}
            runtimeError={runtimeError}
            revision={revision}
            frameRef={frame}
            onDevice={setDevice}
            onReload={() => {
              setRuntimeError("");
              setRevision((value) => value + 1);
            }}
            onDismissErrors={() => {
              setBuildError("");
              setRuntimeError("");
            }}
          />
        </section>
      </div>
    </main>
  );
}
