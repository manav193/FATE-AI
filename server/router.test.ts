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

test("routes native Groq accounts through the OpenAI-compatible endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ choices: [{ message: { content: "groq connected" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const routed = await routeChat(
      [{
        id: "groq-free",
        provider: "groq",
        apiKey: "test-groq-key",
        model: "llama-3.1-8b-instant",
        priority: 10,
        enabled: true,
      }],
      { messages: [{ role: "user", content: "hello" }] },
    );
    assert.equal(routed.result.provider, "groq");
    assert.equal(routed.result.text, "groq connected");
    assert.equal(requestedUrl, "https://api.groq.com/openai/v1/chat/completions");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes native OpenRouter accounts through its OpenAI-compatible endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedHeaders: unknown;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedHeaders = init?.headers;
    return new Response(JSON.stringify({ choices: [{ message: { content: "openrouter connected" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const routed = await routeChat(
      [{ id: "openrouter-free", provider: "openrouter", apiKey: "test-openrouter-key", model: "google/gemma-4-26b-a4b-it:free", priority: 10, enabled: true }],
      { messages: [{ role: "user", content: "hello" }] },
    );
    assert.equal(routed.result.provider, "openrouter");
    assert.equal(requestedUrl, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal((requestedHeaders as Record<string, string>)["X-Title"], "FATE AI");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("skips an invalid account and continues to another provider", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { message: "invalid key" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: "fallback worked" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const routed = await routeChat(
      [
        accounts[0],
        {
          id: "groq-fallback",
          provider: "groq",
          apiKey: "test-groq-key",
          model: "llama-3.1-8b-instant",
          priority: 20,
          enabled: true,
        },
      ],
      { messages: [{ role: "user", content: "continue" }] },
    );
    assert.equal(routed.result.provider, "groq");
    assert.equal(routed.result.text, "fallback worked");
    assert.equal(routed.attempts[0].status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
