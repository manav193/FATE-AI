import type { ChatRequest, ProviderAccount, ProviderResult } from "./types";

class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function jsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 300) || "Provider returned a non-JSON response" } };
  }
}

function assertOk(response: Response, body: unknown): void {
  if (response.ok) return;
  const message =
    typeof body === "object" && body && "error" in body
      ? JSON.stringify((body as { error: unknown }).error).slice(0, 500)
      : "Provider request failed";
  throw new ProviderHttpError(message, response.status, response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500);
}

async function openAi(account: ProviderAccount, request: ChatRequest, signal: AbortSignal): Promise<string> {
  const response = await fetch((account.baseUrl || "https://api.openai.com") + "/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: "Bearer " + account.apiKey },
    body: JSON.stringify({ model: account.model, messages: request.messages, temperature: request.temperature ?? 0.7 }),
  });
  const body = await jsonResponse(response);
  assertOk(response, body);
  const text = (body as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI response contained no text");
  return text;
}

async function gemini(account: ProviderAccount, request: ChatRequest, signal: AbortSignal): Promise<string> {
  const system = request.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n");
  const contents = request.messages.filter((message) => message.role !== "system").map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  const url = (account.baseUrl || "https://generativelanguage.googleapis.com") + "/v1beta/models/" + encodeURIComponent(account.model) + ":generateContent?key=" + encodeURIComponent(account.apiKey);
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: request.temperature ?? 0.7 },
    }),
  });
  const body = await jsonResponse(response);
  assertOk(response, body);
  const text = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (!text) throw new Error("Gemini response contained no text");
  return text;
}

async function anthropic(account: ProviderAccount, request: ChatRequest, signal: AbortSignal): Promise<string> {
  const system = request.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n");
  const messages = request.messages.filter((message) => message.role !== "system");
  const response = await fetch((account.baseUrl || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": account.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: account.model, max_tokens: 4096, system: system || undefined, messages, temperature: request.temperature ?? 0.7 }),
  });
  const body = await jsonResponse(response);
  assertOk(response, body);
  const text = (body as { content?: Array<{ type?: string; text?: string }> }).content?.filter((part) => part.type === "text").map((part) => part.text || "").join("");
  if (!text) throw new Error("Anthropic response contained no text");
  return text;
}

export async function executeProvider(account: ProviderAccount, request: ChatRequest, signal: AbortSignal): Promise<ProviderResult> {
  const text =
    account.provider === "openai"
      ? await openAi(account, request, signal)
      : account.provider === "gemini"
        ? await gemini(account, request, signal)
        : await anthropic(account, request, signal);

  return { text, provider: account.provider, accountId: account.id, model: account.model };
}

export function classifyProviderError(error: unknown): { retryable: boolean; status?: number; reason: string } {
  if (error instanceof ProviderHttpError) return { retryable: error.retryable, status: error.status, reason: error.message };
  if (error instanceof DOMException && error.name === "AbortError") return { retryable: true, reason: "Provider request timed out" };
  return { retryable: true, reason: error instanceof Error ? error.message : "Unknown provider error" };
}
