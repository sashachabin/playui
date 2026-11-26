import { useEffect, useState } from "react";
import { App } from "./App";
import { Brand } from "./Brand";
import { SharedView } from "./SharedView";
import { decodeSnapshot, type SharedProject } from "./lib/share";
import { parseLocation } from "./lib/url";
import type { Device } from "./types";

type ShareState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      project: SharedProject;
      payload: string;
      page: string;
      device: Device;
      theme?: "light" | "dark";
    };

export function Root() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const location = parseLocation(hash);
  if (location.kind === "share") {
    return <SharedLoader hash={hash} />;
  }
  return <App />;
}

function SharedLoader({ hash }: { hash: string }) {
  const [state, setState] = useState<ShareState>({ status: "loading" });

  useEffect(() => {
    let stale = false;
    const location = parseLocation(hash);
    if (location.kind !== "share") {
      setState({ status: "error", message: "This share link is not valid." });
      return;
    }
    decodeSnapshot(location.payload)
      .then((project) => {
        if (stale) return;
        setState({
          status: "ready",
          project,
          payload: location.payload,
          page: location.page,
          device: location.device,
          theme: location.theme,
        });
      })
      .catch((error: unknown) => {
        if (stale) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not open this prototype.",
        });
      });
    return () => {
      stale = true;
    };
  }, [hash]);

  if (state.status === "loading") {
    return (
      <main className="share-status">
        <Brand />
        <p>Opening prototype…</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="share-status">
        <Brand />
        <h1>Cannot open this prototype</h1>
        <p>{state.message}</p>
        <a className="shared-back" href="#/">
          Back to PlayUI
        </a>
      </main>
    );
  }

  return (
    <SharedView
      project={state.project}
      payload={state.payload}
      initialPage={state.page}
      initialDevice={state.device}
      initialTheme={state.theme}
    />
  );
}
