import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { loadProviderAccounts } from "./config";
import { NoRouteError, routeChat } from "./router";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(50_000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  temperature: z.number().min(0).max(2).optional(),
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

  app.post("/api/chat", async (request, response) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid chat request", details: parsed.error.flatten() });
      return;
    }

    const accounts = loadProviderAccounts();
    try {
      const routed = await routeChat(accounts, parsed.data);
      response.json({
        message: routed.result.text,
        route: {
          provider: routed.result.provider,
          accountId: routed.result.accountId,
          model: routed.result.model,
          failedAttempts: routed.attempts.length,
        },
      });
    } catch (error) {
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

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    response.status(500).json({ error: "Unexpected server error" });
  });

  return app;
}
