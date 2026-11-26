import { useEffect, useRef, useState } from "react";
import { parseConfig } from "./lib/config";
import type { FileEntry, Page } from "./types";

const PREVIEW_WIDTH = 960;
const PREVIEW_HEIGHT = 720;
const CONCURRENCY = 2;
const cache = new Map<string, Promise<string>>();
let active = 0;
const pending: (() => void)[] = [];

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          pending.shift()?.();
        });
    };
    if (active < CONCURRENCY) run();
    else pending.push(run);
  });
}

function compileThumbnail(
  files: FileEntry[],
  pages: Page[],
  route: string,
  dark: boolean,
  locale: string,
  afterSubmit: string,
): Promise<string> {
  const key = JSON.stringify([files, pages, route, dark, locale, afterSubmit]);
  const cached = cache.get(key);
  if (cached) return cached;
  const request = schedule(async () => {
    const runtime = await import("../preview/compile");
    const bundle = await runtime.compilePreview(
      Object.fromEntries(files.map((file) => [file.name, file.value])),
    );
    return runtime.previewDocument(bundle, {
      route,
      dark,
      locale,
      outlines: false,
      afterSubmit,
    });
  });
  cache.set(key, request);
  request.catch(() => cache.delete(key));
  if (cache.size > 16) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return request;
}

export function ProjectPreview({ files, pages }: { files: FileEntry[]; pages: Page[] }) {
  const host = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.26);
  const [html, setHtml] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const update = () =>
      setScale(Math.max(0.01, element.getBoundingClientRect().width / PREVIEW_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const config = parseConfig(files);
    const configured = typeof config?.startRoute === "string" ? config.startRoute : undefined;
    const route =
      configured && pages.some((page) => page.path === configured)
        ? configured
        : (pages[0]?.path ?? "/");
    const afterSubmit =
      typeof config?.afterSubmit === "string" &&
      pages.some((page) => page.path === config.afterSubmit)
        ? config.afterSubmit
        : "";
    const locale = typeof config?.locale === "string" ? config.locale : "en-US";
    const dark = config?.theme === "dark";
    let stale = false;
    setHtml("");
    setLoaded(false);
    setFailed(false);
    compileThumbnail(files, pages, route, dark, locale, afterSubmit)
      .then((result) => {
        if (!stale) setHtml(result);
      })
      .catch(() => {
        if (!stale) setFailed(true);
      });
    return () => {
      stale = true;
    };
  }, [visible, files, pages]);

  return (
    <span className="project-preview" ref={host} aria-hidden="true">
      {html && (
        <iframe
          title=""
          tabIndex={-1}
          sandbox="allow-scripts allow-forms"
          srcDoc={html}
          onLoad={() => setLoaded(true)}
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transform: `scale(${scale})`,
          }}
        />
      )}
      {(!html || !loaded) && !failed && (
        <span className="project-preview-skeleton">Rendering preview…</span>
      )}
      {failed && <span className="project-preview-failed">Preview unavailable</span>}
    </span>
  );
}
