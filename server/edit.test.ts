import assert from "node:assert/strict";
import test from "node:test";
import { generateEdit, GenerationError } from "./edit.ts";

const files = { "App.tsx": "export default () => <div>Hello</div>;" };

test("retries with compiler feedback and returns the repaired answer", async () => {
  const prompts: string[] = [];
  const result = await generateEdit(files, "Make it blue", async (contents, attempt) => {
    prompts.push(contents);
    if (attempt === 1) {
      return JSON.stringify({
        text: "blue",
        files: [{ name: "App.tsx", content: "export default () => <div" }],
        actions: [],
      });
    }
    return JSON.stringify({
      text: "blue",
      files: [
        {
          name: "App.tsx",
          content:
            'import "./styles.css";\nexport default () => <div className="blue">Hello</div>;',
        },
        { name: "styles.css", content: ".blue { color: blue; }" },
      ],
      actions: [],
    });
  });

  assert.equal(prompts.length, 2);
  assert.match(prompts[1]!, /previous answer was rejected/i);
  assert.match(prompts[1]!, /Expected/);
  assert.match(prompts[1]!, /project_pages/);
  assert.equal(result.text, "blue");
  assert.match(result.files["App.tsx"]!, /className="blue"/);
});

test("fails after the attempt budget when the model keeps breaking the code", async () => {
  let calls = 0;
  await assert.rejects(
    generateEdit(
      files,
      "Make it blue",
      async () => {
        calls++;
        return JSON.stringify({
          text: "broken",
          files: [{ name: "App.tsx", content: "export default () => <div" }],
          actions: [],
        });
      },
      2,
    ),
    (error: unknown) =>
      error instanceof GenerationError &&
      /did not return working code after 2 attempts/.test(error.message),
  );
  assert.equal(calls, 2);
});

test("repairs malformed JSON", async () => {
  const result = await generateEdit(files, "Rename", async (_contents, attempt) =>
    attempt === 1
      ? "not json"
      : JSON.stringify({
          text: "renamed",
          files: [{ name: "App.tsx", content: "export default () => 1;" }],
          actions: [],
        }),
  );
  assert.equal(result.text, "renamed");
});

test("accepts action-only answers", async () => {
  const result = await generateEdit(files, "Add a page", async () =>
    JSON.stringify({
      text: "Added Pricing",
      files: [],
      actions: [{ type: "add_page", label: "Pricing", path: "/pricing" }],
    }),
  );
  assert.equal(result.actions.length, 1);
});
