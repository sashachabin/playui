export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
};

export type ServerConfig = {
  port: number;
  provider: ProviderConfig;
  maxAttempts: number;
  maxBodyBytes: number;
  maxFilesChars: number;
  maxPromptChars: number;
  serverTimeoutMs: number;
};

const DEFAULTS = {
  port: 8787,
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-flash",
  maxAttempts: 2,
  maxTokens: 32_768,
  requestTimeoutMs: 90_000,
  serverTimeoutMs: 240_000,
  maxBodyBytes: 1_000_000,
  maxFilesChars: 400_000,
  maxPromptChars: 4_000,
};

function readInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: readInt(env.PORT, DEFAULTS.port, 1, 65_535),
    provider: {
      baseUrl: (env.AI_BASE_URL ?? DEFAULTS.baseUrl).replace(/\/+$/, ""),
      apiKey: env.AI_API_KEY ?? "",
      model: env.AI_MODEL ?? DEFAULTS.model,
      timeoutMs: DEFAULTS.requestTimeoutMs,
      maxTokens: readInt(env.AI_MAX_OUTPUT_TOKENS, DEFAULTS.maxTokens, 1_024, 131_072),
    },
    maxAttempts: readInt(env.AI_MAX_ATTEMPTS, DEFAULTS.maxAttempts, 1, 4),
    maxBodyBytes: DEFAULTS.maxBodyBytes,
    maxFilesChars: DEFAULTS.maxFilesChars,
    maxPromptChars: DEFAULTS.maxPromptChars,
    serverTimeoutMs: DEFAULTS.serverTimeoutMs,
  };
}
