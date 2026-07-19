export type ProviderHealth = "healthy" | "degraded" | "offline";
export type ProviderRole = "primary" | "standby" | "fallback";

export interface ProviderAccount {
  id: string;
  provider: "OpenAI" | "Google AI" | "Anthropic" | "OpenRouter";
  accountName: string;
  model: string;
  health: ProviderHealth;
  role: ProviderRole;
  remainingPercent: number;
  latencyMs: number;
  accent: string;
}

export interface RouteEvent {
  id: string;
  accountId: string;
  label: string;
  state: "active" | "ready" | "skipped";
  reason: string;
}

export type WorkspaceView =
  | "Chat"
  | "Compare models"
  | "Coding agent"
  | "Provider vault"
  | "Usage & cost";
