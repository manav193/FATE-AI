import type { ProviderAccount, ProviderName } from "./types";

const defaults: Record<ProviderName, string> = {
  openai: "gpt-4.1-mini",
  openrouter: "google/gemma-3-27b-it:free",
  groq: "llama-3.1-8b-instant",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-20250514",
};

function fromEnvironment(): ProviderAccount[] {
  const accounts: ProviderAccount[] = [];
  const values: Array<[ProviderName, string | undefined, string | undefined]> = [
    ["openai", process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL],
    ["openrouter", process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_MODEL],
    ["groq", process.env.GROQ_API_KEY, process.env.GROQ_MODEL],
    ["gemini", process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL],
    ["anthropic", process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL],
  ];

  for (const [provider, apiKey, model] of values) {
    if (!apiKey) continue;
    accounts.push({
      id: provider + "-default",
      provider,
      apiKey,
      model: model || defaults[provider],
      priority: accounts.length * 10 + 10,
      enabled: true,
      baseUrl: provider === "groq" ? "https://api.groq.com/openai" : provider === "openrouter" ? "https://openrouter.ai/api" : undefined,
    });
  }

  return accounts;
}

function fromJson(value: string): ProviderAccount[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("FATE_PROVIDER_ACCOUNTS_JSON must be an array");

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Provider account at index " + index + " is invalid");
    const account = item as Record<string, unknown>;
    const provider = account.provider;
    if (provider !== "openai" && provider !== "openrouter" && provider !== "groq" && provider !== "gemini" && provider !== "anthropic") {
      throw new Error("Unsupported provider at index " + index);
    }
    if (typeof account.apiKey !== "string" || account.apiKey.length < 8) {
      throw new Error("Provider account at index " + index + " has no usable apiKey");
    }

    return {
      id: typeof account.id === "string" ? account.id : provider + "-" + (index + 1),
      provider,
      apiKey: account.apiKey,
      model: typeof account.model === "string" ? account.model : defaults[provider],
      priority: typeof account.priority === "number" ? account.priority : (index + 1) * 10,
      enabled: account.enabled !== false,
      baseUrl: typeof account.baseUrl === "string" ? account.baseUrl : undefined,
    };
  });
}

export function loadProviderAccounts(): ProviderAccount[] {
  const json = process.env.FATE_PROVIDER_ACCOUNTS_JSON;
  const accounts = json ? fromJson(json) : fromEnvironment();
  return accounts.filter((account) => account.enabled).sort((a, b) => a.priority - b.priority);
}

export const providerTimeoutMs = Math.max(5_000, Number(process.env.PROVIDER_TIMEOUT_MS) || 45_000);
