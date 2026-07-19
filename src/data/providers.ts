import type { ProviderAccount, RouteEvent } from "../types";

export const providerAccounts: ProviderAccount[] = [
  {
    id: "openai-01",
    provider: "OpenAI",
    accountName: "Production 01",
    model: "GPT flagship",
    health: "healthy",
    role: "primary",
    remainingPercent: 82,
    latencyMs: 1680,
    accent: "#9b7cff",
  },
  {
    id: "google-01",
    provider: "Google AI",
    accountName: "Workspace key",
    model: "Gemini Pro",
    health: "healthy",
    role: "standby",
    remainingPercent: 78,
    latencyMs: 1240,
    accent: "#55c2ff",
  },
  {
    id: "anthropic-02",
    provider: "Anthropic",
    accountName: "Team 02",
    model: "Claude",
    health: "degraded",
    role: "standby",
    remainingPercent: 46,
    latencyMs: 2140,
    accent: "#f4ad61",
  },
  {
    id: "openrouter-01",
    provider: "OpenRouter",
    accountName: "Fallback pool",
    model: "Multi-model",
    health: "healthy",
    role: "fallback",
    remainingPercent: 64,
    latencyMs: 1910,
    accent: "#38ddb0",
  },
];

export const routeEvents: RouteEvent[] = [
  {
    id: "route-1",
    accountId: "openai-01",
    label: "OpenAI · Production 01",
    state: "active",
    reason: "Best quality match · healthy",
  },
  {
    id: "route-2",
    accountId: "google-01",
    label: "Google AI · Workspace key",
    state: "ready",
    reason: "Fastest healthy standby",
  },
  {
    id: "route-3",
    accountId: "anthropic-02",
    label: "Anthropic · Team 02",
    state: "skipped",
    reason: "Latency above policy threshold",
  },
];
