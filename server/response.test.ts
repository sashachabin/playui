import assert from "node:assert/strict";
import test from "node:test";
import { parseModelResponse } from "./response.ts";

test("normalizes the response schema shape", () => {
  const result = parseModelResponse(
    JSON.stringify({
      text: " Changed the heading. ",
      files: [{ name: "App.tsx", content: "export default () => null;" }],
      actions: [],
    }),
  );
  assert.equal(result.text, "Changed the heading.");
  assert.deepEqual(result.files, { "App.tsx": "export default () => null;" });
});

test("accepts a file map from older prompts", () => {
  const result = parseModelResponse(
    JSON.stringify({ text: "ok", files: { "styles.css": ".a { color: red; }" } }),
  );
  assert.deepEqual(result.files, { "styles.css": ".a { color: red; }" });
});

test("rejects path traversal and unknown extensions", () => {
  for (const name of ["../App.tsx", "a/../../App.tsx", "App.md", ""]) {
    assert.throws(
      () => parseModelResponse(JSON.stringify({ text: "x", files: [{ name, content: "x" }] })),
      /Invalid file name/,
    );
  }
});

test("rejects empty files, duplicates and malformed JSON", () => {
  assert.throws(
    () =>
      parseModelResponse(JSON.stringify({ text: "x", files: [{ name: "App.tsx", content: " " }] })),
    /is empty/,
  );
  assert.throws(
    () =>
      parseModelResponse(
        JSON.stringify({
          text: "x",
          files: [
            { name: "App.tsx", content: "a" },
            { name: "App.tsx", content: "b" },
          ],
        }),
      ),
    /Duplicate file/,
  );
  assert.throws(() => parseModelResponse("not json"), /malformed JSON/);
  assert.throws(() => parseModelResponse(""), /empty response/);
});

test("accepts editor actions", () => {
  const result = parseModelResponse(
    JSON.stringify({
      text: "Added Pricing",
      files: [],
      actions: [
        { type: "add_page", label: "Pricing", path: "/pricing" },
        { type: "set_theme", theme: "dark" },
        { type: "set_outlines", enabled: true },
      ],
    }),
  );
  assert.equal(result.actions.length, 3);
  assert.equal(result.actions[0]!.type, "add_page");
  assert.equal(result.actions[2]!.enabled, true);
});

test("rejects unknown actions", () => {
  assert.throws(
    () =>
      parseModelResponse(
        JSON.stringify({ text: "x", files: [], actions: [{ type: "launch_missiles" }] }),
      ),
    /Unknown action/,
  );
});

test("allows an action-only response without files", () => {
  const result = parseModelResponse(
    JSON.stringify({ actions: [{ type: "navigate", path: "/login" }] }),
  );
  assert.equal(result.text, "Done.");
  assert.equal(result.actions.length, 1);
  assert.deepEqual(result.files, {});
});
