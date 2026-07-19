# FATE AI

A professional multi-model AI workspace designed to keep conversations and coding tasks moving across officially connected AI providers.

## What is included in the first foundation

- Premium responsive chat workspace
- Provider account pool with health, budget, latency, and priority visibility
- Smart routing and automatic failover timeline
- Chat, model comparison, coding agent, provider vault, and usage views
- Local interactive demo state with no secrets required
- Type-safe provider and routing models

> Consumer subscriptions such as ChatGPT Plus, Claude Pro, or Gemini Advanced are not API balances. FATE AI will support official provider APIs and provider-authorized OAuth flows only.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## Current status

This repository currently contains the product UI and routing-domain foundation. Provider authentication, encrypted server-side credential storage, real streaming completions, sandboxed coding execution, and durable usage tracking are the next implementation layers.

## Planned architecture

- React + TypeScript client
- Server-side provider adapters
- Encrypted credential vault
- Capability-aware routing engine
- Context checkpoints for seamless failover
- Sandboxed coding-agent runtime
- Audit logs, budgets, and usage controls

## Security principles

- Never expose raw provider credentials to the browser
- Never log secrets or full authorization headers
- Encrypt credentials at rest and use short-lived server sessions
- Require explicit approval for destructive coding-agent actions
- Preserve provider terms, rate limits, and account policies

## License

No license has been granted yet. All rights reserved until a license is added.
