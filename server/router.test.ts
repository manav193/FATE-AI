import assert from "node:assert/strict";
import test from "node:test";
import { NoRouteError, routeChat } from "./router";
import type { ProviderAccount } from "./types";

const accounts: ProviderAccount[] = [
  {
    id: "primary",
    provider: "openai",
    apiKey: "test-primary-key",
    model: "test-model",
    priority: 10,
    enabled: true,
  },
  {
    id: "standby",
    provider: "openai",
    apiKey: "test-standby-key",
    model: "test-model",
    priority: 20,
    enabled: true,
  },
];

test("fails over from a rate-limited account to the next account", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { message: "rate limited" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: "continued successfully" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const routed = await routeChat(accounts, { messages: [{ role: "user", content: "continue" }] });
    assert.equal(routed.result.accountId, "standby");
    assert.equal(routed.result.text, "continued successfully");
    assert.equal(routed.attempts.length, 1);
    assert.equal(routed.attempts[0].status, 429);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports a clear error when no account is configured", async () => {
  await assert.rejects(
    () => routeChat([], { messages: [{ role: "user", content: "hello" }] }),
    (error: unknown) => error instanceof NoRouteError && error.attempts.length === 0,
  );
});
