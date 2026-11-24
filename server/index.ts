import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readServerConfig } from "./config.ts";
import { generateEdit, GenerationError } from "./edit.ts";
import type { EditorContext } from "./prompt.ts";
import { createProviderCompleter, ProviderError, TruncatedOutputError } from "./provider.ts";

const config = readServerConfig();
const completer = createProviderCompleter(config.provider);

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function log(message: string) {
  process.stderr.write(`[ai] ${message}\n`);
}

function send(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status).end(JSON.stringify(payload));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > config.maxBodyBytes) {
      throw new HttpError(413, "Request body is too large (max 1 MB).");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readInput(request: IncomingMessage) {
  let body: unknown;
  try {
    body = JSON.parse(await readBody(request));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Request body must be valid JSON.");
  }
  if (!isRecord(body)) throw new HttpError(400, "Request body must be a JSON object.");

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) throw new HttpError(400, "Enter a prompt.");
  if (prompt.length > config.maxPromptChars) {
    throw new HttpError(400, "Enter a prompt under 4,000 characters.");
  }

  if (!isRecord(body.files)) throw new HttpError(400, "Project files must be an object.");
  const files: Record<string, string> = {};
  let total = 0;
  for (const [name, value] of Object.entries(body.files)) {
    if (typeof value !== "string") throw new HttpError(400, `File ${name} must be a string.`);
    total += value.length;
    if (total > config.maxFilesChars) {
      throw new HttpError(413, "Project files are too large to send to the model.");
    }
    files[name] = value;
  }

  const pages = Array.isArray(body.pages)
    ? body.pages
        .filter(isRecord)
        .map((page) => ({
          path: typeof page.path === "string" ? page.path : "",
          label: typeof page.label === "string" ? page.label : "",
        }))
        .filter((page) => page.path.startsWith("/") && page.label.trim())
        .slice(0, 50)
    : [];
  const rawContext = isRecord(body.context) ? body.context : {};
  const context: EditorContext = {
    pages,
    route: typeof rawContext.route === "string" ? rawContext.route : "/",
    theme: typeof rawContext.theme === "string" ? rawContext.theme : "light",
    device: typeof rawContext.device === "string" ? rawContext.device : "desktop",
    tab: typeof rawContext.tab === "string" ? rawContext.tab : "preview",
  };

  return { prompt, files, context };
}

function providerFailure(error: ProviderError) {
  const hint =
    error.status === 401 || error.status === 403
      ? " Check that AI_API_KEY is valid and has access."
      : error.status === 402
        ? " The API account has insufficient balance."
        : error.status === 429
          ? " The provider rate limit was hit; try again shortly."
          : error.status === 503
            ? " The provider is overloaded; try again shortly."
            : "";
  return {
    status: error.status === 429 || error.status === 503 ? error.status : 502,
    message: `AI provider error (${error.status}): ${error.message.slice(0, 400)}${hint}`,
  };
}

function applyCors(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  const allowed =
    origin && /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)
      ? origin
      : "http://localhost:5173";
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", allowed);
  response.setHeader("vary", "origin");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-allow-methods", "POST, OPTIONS");
}

async function complete(contents: string, attempt: number): Promise<string> {
  const started = Date.now();
  const text = await completer(contents, attempt);
  log(`${config.provider.model} attempt ${attempt} finished in ${Date.now() - started}ms`);
  return text;
}

const server = createServer(async (request, response) => {
  applyCors(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/generate") {
    send(response, 404, { error: "Not found" });
    return;
  }

  try {
    if (!config.provider.apiKey) {
      throw new HttpError(503, "Set AI_API_KEY in .env to enable AI.");
    }
    const { prompt, files, context } = await readInput(request);
    const result = await generateEdit(files, prompt, complete, config.maxAttempts, log, context);
    send(response, 200, {
      text: result.text,
      files: result.files,
      actions: result.actions,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      send(response, error.status, { error: error.message });
      return;
    }
    if (error instanceof GenerationError) {
      log(`generation failed: ${error.message}`);
      send(response, 502, { error: error.message });
      return;
    }
    if (error instanceof TruncatedOutputError) {
      log("the provider truncated the answer twice");
      send(response, 502, {
        error:
          "The answer was too long and got cut off. Try a smaller change, or split it into two requests.",
      });
      return;
    }
    if (error instanceof ProviderError) {
      const failure = providerFailure(error);
      log(`${config.provider.model} failed: ${failure.message}`);
      send(response, failure.status, { error: failure.message });
      return;
    }
    log(`unexpected failure: ${error instanceof Error ? error.message : String(error)}`);
    send(response, 502, { error: "AI request failed." });
  }
});

server.requestTimeout = config.serverTimeoutMs;
server.listen(config.port, "127.0.0.1", () => {
  process.stdout.write(
    `PlayUI AI server listening on http://127.0.0.1:${config.port} (${config.provider.model})\n`,
  );
});
