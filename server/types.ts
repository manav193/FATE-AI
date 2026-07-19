export type ProviderName = "openai" | "gemini" | "anthropic";

export interface ProviderAccount {
  id: string;
  provider: ProviderName;
  apiKey: string;
  model: string;
  priority: number;
  enabled: boolean;
  baseUrl?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
}

export interface ProviderResult {
  text: string;
  provider: ProviderName;
  accountId: string;
  model: string;
}

export interface FailedAttempt {
  accountId: string;
  provider: ProviderName;
  retryable: boolean;
  status?: number;
  reason: string;
}
