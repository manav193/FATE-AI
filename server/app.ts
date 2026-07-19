import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { loadProviderAccounts } from "./config";
import { codingAgentPrompt, repositorySnapshot } from "./agent";
import { recordRequest, usageSnapshot } from "./metrics";
import { compareChat, NoRouteError, routeChat } from "./router";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(50_000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  temperature: z.number().min(0).max(2).optional(),
  preferredAccountId: z.string().trim().min(1).max(120).optional(),
});

const agentSchema = z.object({
  task: z.string().trim().min(3).max(4_000),
  preferredAccountId: z.string().trim().min(1).max(120).optional(),
});

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-origin" } }));
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_request, response) => {
    const accounts = loadProviderAccounts();
    response.json({ ok: true, configuredAccounts: accounts.length });
  });

  app.get("/api/providers", (_request, response) => {
    const accounts = loadProviderAccounts();
    response.json({
      providers: accounts.map(({ id, provider, model, priority, enabled }) => ({ id, provider, model, priority, enabled })),
    });
  });

  app.get("/api/usage", (_request, response) => {
    response.json(usageSnapshot());
  });

  app.post("/api/chat", async (request, response) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid chat request", details: parsed.error.flatten() });
      return;
    }

    const accounts = loadProviderAccounts();
    const startedAt = Date.now();
    try {
      const routed = await routeChat(accounts, parsed.data);
      const latencyMs = Date.now() - startedAt;
      recordRequest(true, latencyMs, routed.attempts.length);
      response.json({
        message: routed.result.text,
        route: {
          provider: routed.result.provider,
          accountId: routed.result.accountId,
          model: routed.result.model,
          failedAttempts: routed.attempts.length,
          latencyMs,
        },
      });
    } catch (error) {
      recordRequest(false, Date.now() - startedAt);
      if (error instanceof NoRouteError) {
        response.status(accounts.length ? 502 : 503).json({
          error: error.message,
          attempts: error.attempts.map(({ accountId, provider, status, reason }) => ({ accountId, provider, status, reason })),
        });
        return;
      }
      response.status(500).json({ error: "Unexpected routing failure" });
    }
  });

  app.post("/api/compare", async (request, response) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid comparison request", details: parsed.error.flatten() });
      return;
    }
    const accounts = loadProviderAccounts();
    if (!accounts.length) {
      response.status(503).json({ error: "No provider accounts are configured", results: [] });
      return;
    }
    const startedAt = Date.now();
    const results = await compareChat(accounts, parsed.data);
    const successCount = results.filter((item) => item.ok).length;
    recordRequest(successCount > 0, Date.now() - startedAt, results.length - successCount);
    response.status(successCount ? 200 : 502).json({ results });
  });

  app.post("/api/agent/run", async (request, response) => {
    const parsed = agentSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid coding-agent task", details: parsed.error.flatten() });
      return;
    }
    const accounts = loadProviderAccounts();
    if (!accounts.length) {
      response.status(503).json({ error: "No provider accounts are configured" });
      return;
    }
    const startedAt = Date.now();
    try {
      const snapshot = await repositorySnapshot();
      const routed = await routeChat(accounts, { ...codingAgentPrompt(parsed.data.task, snapshot), preferredAccountId: parsed.data.preferredAccountId });
      const latencyMs = Date.now() - startedAt;
      recordRequest(true, latencyMs, routed.attempts.length);
      response.json({
        output: routed.result.text,
        repository: snapshot.rootName,
        filesScanned: snapshot.files,
        route: { provider: routed.result.provider, accountId: routed.result.accountId, model: routed.result.model, failedAttempts: routed.attempts.length, latencyMs },
        mode: "read-only",
      });
    } catch (error) {
      recordRequest(false, Date.now() - startedAt);
      if (error instanceof NoRouteError) {
        response.status(502).json({ error: error.message });
        return;
      }
      response.status(500).json({ error: error instanceof Error ? error.message : "Coding agent failed" });
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    response.status(500).json({ error: "Unexpected server error" });
  });

  return app;
}
