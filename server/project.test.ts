import assert from "node:assert/strict";
import test from "node:test";
import { findProjectErrors } from "./project.ts";

const validApp = `import { useState } from "react";
import { Button } from "@skbkontur/react-ui";
import "./styles.css";

export default function App({ route = "/" }) {
  const [count, setCount] = useState(0);
  return <main className="page"><Button onClick={() => setCount(count + 1)}>{route}{count}</Button></main>;
}`;

test("passes a valid project", async () => {
  assert.deepEqual(
    await findProjectErrors({
      "App.tsx": validApp,
      "styles.css": ".page { color: red; }",
      "playui.config.json": '{"packages":{"@skbkontur/react-ui":"6.5.7"}}',
    }),
    [],
  );
});

test("passes nested files and CSS imports", async () => {
  assert.deepEqual(
    await findProjectErrors({
      "App.tsx": 'import Page from "./pages/Page.tsx";\nexport default () => <Page />;',
      "pages/Page.tsx": 'import "./page.css";\nexport default () => <div className="p" />;',
      "pages/page.css": ".p { color: blue; }",
    }),
    [],
  );
});

test("reports syntax errors with a location", async () => {
  const errors = await findProjectErrors({ "App.tsx": validApp.replace("</main>", "</main") });
  assert.equal(errors.length > 0, true);
  assert.match(errors[0]!, /App\.tsx:\d+:\d+/);
});

test("reports missing local imports", async () => {
  const errors = await findProjectErrors({
    "App.tsx": 'import "./Missing.tsx";\nexport default () => null;',
  });
  assert.match(errors.join("\n"), /Could not resolve "\.\/Missing\.tsx"/);
});

test("reports unsupported bare imports", async () => {
  const errors = await findProjectErrors({
    "App.tsx": 'import clsx from "left-pad";\nexport default () => clsx("a");',
  });
  assert.match(errors.join("\n"), /unsupported import "left-pad"/);
});

test("allows packages declared in playui.config.json", async () => {
  const errors = await findProjectErrors({
    "App.tsx": 'import clsx from "clsx";\nexport default () => <div className={clsx("a")} />;',
    "playui.config.json": '{"packages":{"clsx":"2.1.1"}}',
  });
  assert.deepEqual(errors, []);
});

test("rejects packages without an exact version", async () => {
  const errors = await findProjectErrors({
    "App.tsx": 'import clsx from "clsx";\nexport default () => <div className={clsx("a")} />;',
    "playui.config.json": '{"packages":{"clsx":"latest"}}',
  });
  assert.match(errors.join("\n"), /unsupported import "clsx"/);
});

test("allows the bundled and on-demand design systems", async () => {
  const errors = await findProjectErrors({
    "App.tsx":
      'import { Button } from "@mui/material";\nimport { Input } from "@chakra-ui/react";\nexport default () => <Button />;',
  });
  assert.deepEqual(errors, []);
});
