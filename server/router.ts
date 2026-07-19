import { executeProvider, classifyProviderError } from "./adapters";
import { providerTimeoutMs } from "./config";
import { recordProviderAttempt } from "./metrics";
import type { ChatRequest, FailedAttempt, ProviderAccount, ProviderResult } from "./types";

export class NoRouteError extends Error {
  constructor(readonly attempts: FailedAttempt[]) {
    super(attempts.length ? "Every configured provider route failed" : "No provider accounts are configured");
  }
}

export async function routeChat(accounts: ProviderAccount[], request: ChatRequest): Promise<{ result: ProviderResult; attempts: FailedAttempt[] }> {
  const attempts: FailedAttempt[] = [];

  for (const account of accounts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), providerTimeoutMs);
    const startedAt = Date.now();

    try {
      const result = await executeProvider(account, request, controller.signal);
      recordProviderAttempt(account.provider, true, Date.now() - startedAt);
      return { result, attempts };
    } catch (error) {
      recordProviderAttempt(account.provider, false, Date.now() - startedAt);
      const classified = classifyProviderError(error);
      attempts.push({ accountId: account.id, provider: account.provider, ...classified });
    } finally {
      clearTimeout(timer);
    }
  }

  throw new NoRouteError(attempts);
}

export async function compareChat(accounts: ProviderAccount[], request: ChatRequest) {
  const selected = accounts.slice(0, 3);
  return Promise.all(selected.map(async (account) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), providerTimeoutMs);
    const startedAt = Date.now();
    try {
      const result = await executeProvider(account, request, controller.signal);
      const latencyMs = Date.now() - startedAt;
      recordProviderAttempt(account.provider, true, latencyMs);
      return { ok: true as const, ...result, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      recordProviderAttempt(account.provider, false, latencyMs);
      const classified = classifyProviderError(error);
      return {
        ok: false as const,
        provider: account.provider,
        accountId: account.id,
        model: account.model,
        latencyMs,
        status: classified.status,
        reason: classified.reason,
      };
    } finally {
      clearTimeout(timer);
    }
  }));
}
