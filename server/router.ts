import { executeProvider, classifyProviderError } from "./adapters";
import { providerTimeoutMs } from "./config";
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

    try {
      const result = await executeProvider(account, request, controller.signal);
      return { result, attempts };
    } catch (error) {
      const classified = classifyProviderError(error);
      attempts.push({ accountId: account.id, provider: account.provider, ...classified });
    } finally {
      clearTimeout(timer);
    }
  }

  throw new NoRouteError(attempts);
}
