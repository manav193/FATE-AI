import type { ProviderName } from "./types";

interface ProviderMetrics {
  requests: number;
  successes: number;
  failures: number;
  latencyTotalMs: number;
}

interface UsageSnapshot {
  startedAt: string;
  requests: number;
  successes: number;
  failures: number;
  failovers: number;
  averageLatencyMs: number;
  providers: Array<ProviderMetrics & { provider: ProviderName; averageLatencyMs: number }>;
}

const startedAt = new Date().toISOString();
const providers = new Map<ProviderName, ProviderMetrics>();
let requests = 0;
let successes = 0;
let failures = 0;
let failovers = 0;
let latencyTotalMs = 0;

function providerBucket(provider: ProviderName): ProviderMetrics {
  const current = providers.get(provider) ?? { requests: 0, successes: 0, failures: 0, latencyTotalMs: 0 };
  providers.set(provider, current);
  return current;
}

export function recordProviderAttempt(provider: ProviderName, ok: boolean, latencyMs: number): void {
  const bucket = providerBucket(provider);
  bucket.requests += 1;
  bucket.latencyTotalMs += latencyMs;
  if (ok) bucket.successes += 1;
  else bucket.failures += 1;
}

export function recordRequest(ok: boolean, latencyMs: number, failedRoutes = 0): void {
  requests += 1;
  latencyTotalMs += latencyMs;
  failovers += failedRoutes;
  if (ok) successes += 1;
  else failures += 1;
}

export function usageSnapshot(): UsageSnapshot {
  return {
    startedAt,
    requests,
    successes,
    failures,
    failovers,
    averageLatencyMs: requests ? Math.round(latencyTotalMs / requests) : 0,
    providers: [...providers.entries()].map(([provider, value]) => ({
      provider,
      requests: value.requests,
      successes: value.successes,
      failures: value.failures,
      latencyTotalMs: value.latencyTotalMs,
      averageLatencyMs: value.requests ? Math.round(value.latencyTotalMs / value.requests) : 0,
    })),
  };
}
