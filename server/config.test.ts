import assert from "node:assert/strict";
import test from "node:test";
import { loadProviderAccounts } from "./config";

test("one OpenRouter key can expose multiple model routes", () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModels = process.env.OPENROUTER_MODELS;
  const previousJson = process.env.FATE_PROVIDER_ACCOUNTS_JSON;
  try {
    delete process.env.FATE_PROVIDER_ACCOUNTS_JSON;
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.OPENROUTER_MODELS = "cohere/north-mini-code:free, google/gemma-4-31b-it:free,cohere/north-mini-code:free";
    const routes = loadProviderAccounts().filter((account) => account.provider === "openrouter");
    assert.equal(routes.length, 2);
    assert.deepEqual(routes.map((route) => route.model), ["cohere/north-mini-code:free", "google/gemma-4-31b-it:free"]);
    assert.equal(routes.every((route) => route.apiKey === "test-openrouter-key"), true);
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
    if (previousModels === undefined) delete process.env.OPENROUTER_MODELS;
    else process.env.OPENROUTER_MODELS = previousModels;
    if (previousJson === undefined) delete process.env.FATE_PROVIDER_ACCOUNTS_JSON;
    else process.env.FATE_PROVIDER_ACCOUNTS_JSON = previousJson;
  }
});
