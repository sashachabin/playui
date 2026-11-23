import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createProviderCompleter, ProviderError, TruncatedOutputError } from "./provider.ts";

async function readBody(request: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body;
}

async function withFakeApi<T>(
  handler: (body: string, request: IncomingMessage) => { status: number; payload: unknown },
  run: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const { status, payload } = handler(body, request);
    response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${port}/v1`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("sends a JSON-mode completion and returns the content", async () => {
  let seen: {
    model?: string;
    headers?: IncomingMessage["headers"];
    body?: Record<string, unknown>;
  } = {};
  await withFakeApi(
    (body, request) => {
      seen = { headers: request.headers, body: JSON.parse(body) as Record<string, unknown> };
      return {
        status: 200,
        payload: {
          choices: [
            {
              message: { content: '{"text":"ok","files":[],"actions":[]}' },
              finish_reason: "stop",
            },
          ],
        },
      };
    },
    async (baseUrl) => {
      const complete = createProviderCompleter({
        baseUrl,
        apiKey: "test-key",
        model: "test-model",
      });
      const result = await complete("hello", 1);
      assert.equal(result, '{"text":"ok","files":[],"actions":[]}');
    },
  );
  assert.equal(seen.headers?.authorization, "Bearer test-key");
  assert.equal(seen.body?.model, "test-model");
  assert.deepEqual(seen.body?.response_format, { type: "json_object" });
  const messages = seen.body?.messages as { role: string; content: string }[];
  assert.equal(messages[0]!.role, "system");
  assert.equal(messages[1]!.content, "hello");
});

test("surfaces provider errors with their status", async () => {
  await withFakeApi(
    () => ({ status: 402, payload: { error: { message: "Insufficient Balance" } } }),
    async (baseUrl) => {
      const complete = createProviderCompleter({ baseUrl, apiKey: "test-key", model: "m" });
      await assert.rejects(complete("hello", 1), (error: unknown) => {
        assert.equal(error instanceof ProviderError, true);
        assert.equal((error as ProviderError).status, 402);
        assert.match((error as Error).message, /Insufficient Balance/);
        return true;
      });
    },
  );
});

test("retries a truncated answer with a larger budget", async () => {
  let calls = 0;
  const budgets: number[] = [];
  await withFakeApi(
    (body) => {
      const request = JSON.parse(body) as { max_tokens: number };
      budgets.push(request.max_tokens);
      calls += 1;
      return calls === 1
        ? {
            status: 200,
            payload: { choices: [{ message: { content: "{" }, finish_reason: "length" }] },
          }
        : {
            status: 200,
            payload: {
              choices: [
                {
                  message: { content: '{"text":"ok","files":[],"actions":[]}' },
                  finish_reason: "stop",
                },
              ],
            },
          };
    },
    async (baseUrl) => {
      const complete = createProviderCompleter({
        baseUrl,
        apiKey: "test-key",
        model: "m",
        maxTokens: 1_000,
      });
      const result = await complete("hello", 1);
      assert.equal(result, '{"text":"ok","files":[],"actions":[]}');
    },
  );
  assert.equal(calls, 2);
  assert.deepEqual(budgets, [1_000, 2_000]);
});

test("reports truncation after the retry", async () => {
  let calls = 0;
  await withFakeApi(
    () => {
      calls += 1;
      return {
        status: 200,
        payload: { choices: [{ message: { content: "{" }, finish_reason: "length" }] },
      };
    },
    async (baseUrl) => {
      const complete = createProviderCompleter({ baseUrl, apiKey: "test-key", model: "m" });
      await assert.rejects(complete("hello", 1), (error: unknown) => {
        assert.equal(error instanceof TruncatedOutputError, true);
        return true;
      });
    },
  );
  assert.equal(calls, 2);
});

test("reports timeouts as a provider error", async () => {
  const server = createServer((_request, response) => {
    setTimeout(() => response.writeHead(200).end("{}"), 250);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const complete = createProviderCompleter({
      baseUrl: `http://127.0.0.1:${port}/v1`,
      apiKey: "test-key",
      model: "m",
      timeoutMs: 50,
    });
    await assert.rejects(complete("hello", 1), (error: unknown) => {
      assert.equal(error instanceof ProviderError, true);
      assert.equal((error as ProviderError).status, 504);
      return true;
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
