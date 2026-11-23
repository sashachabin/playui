import { SYSTEM_INSTRUCTION } from "./prompt.ts";

export type CompletionConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxTokens?: number;
};

export class ProviderError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class TruncatedOutputError extends Error {
  constructor() {
    super("The model output was truncated.");
    this.name = "TruncatedOutputError";
  }
}

const DEFAULT_MAX_TOKENS = 32_768;
const MAX_TOKENS_CAP = 131_072;

const OUTPUT_CONTRACT = `Return a JSON object with this exact shape:
{"text":"one short sentence","files":[{"name":"App.tsx","content":"complete file contents"}],"actions":[]}
"actions" is always present; use [] when no editor action is needed. See the system rules for supported actions.
Only include files you actually changed; never repeat unchanged files.
Never claim a page, theme, device or file change without the matching action.`;

type ChatCompletion = {
  choices?: {
    message?: { content?: string | null };
    finish_reason?: string;
  }[];
};

async function readResponse(response: Response): Promise<{ content: string; truncated: boolean }> {
  const raw = await response.text();
  if (!response.ok) {
    let detail = raw.slice(0, 400);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // Keep the raw body for non-JSON error responses.
    }
    throw new ProviderError(response.status, detail);
  }

  let data: ChatCompletion;
  try {
    data = JSON.parse(raw) as ChatCompletion;
  } catch {
    throw new ProviderError(502, "The provider returned a non-JSON response.");
  }
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    truncated: choice?.finish_reason === "length",
  };
}

/**
 * Speaks the OpenAI chat-completions protocol, which DeepSeek, OpenRouter,
 * Groq, Ollama and others implement.
 */
export function createProviderCompleter(config: CompletionConfig, fetchImpl: typeof fetch = fetch) {
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  async function request(contents: string, attempt: number, maxTokens: number) {
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: `${SYSTEM_INSTRUCTION}\n${OUTPUT_CONTRACT}` },
            { role: "user", content: contents },
          ],
          response_format: { type: "json_object" },
          temperature: attempt === 1 ? 0.4 : 0.1,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: AbortSignal.timeout(config.timeoutMs ?? 90_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new ProviderError(504, "The provider did not answer in time.");
      }
      throw error;
    }

    return readResponse(response);
  }

  return async (contents: string, attempt: number): Promise<string> => {
    let maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    for (let round = 0; round < 2; round++) {
      const retryHint =
        round === 0
          ? contents
          : `${contents}\n\nIMPORTANT: the previous answer hit the output limit. Return only changed files, keep the code shorter, and return the complete JSON.`;
      const result = await request(retryHint, attempt, maxTokens);
      if (!result.truncated) return result.content;
      maxTokens = Math.min(maxTokens * 2, MAX_TOKENS_CAP);
    }
    throw new TruncatedOutputError();
  };
}
