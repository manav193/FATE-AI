import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowUp, BarChart3, Check, ChevronDown, Clipboard, Code2, Command,
  Download, GitBranch, KeyRound, Menu, MessageSquareText, MoreHorizontal, Plus,
  Search, Settings2, ShieldCheck, Sparkles, SplitSquareVertical, Trash2, X, Zap,
} from "lucide-react";
import type { WorkspaceView } from "./types";

interface RuntimeProvider { id: string; provider: string; model: string; priority: number; enabled: boolean }
interface RuntimeRoute { provider: string; accountId: string; model: string; failedAttempts: number; latencyMs?: number }
interface ChatMessage { id: string; role: "user" | "assistant"; text: string; route?: RuntimeRoute; error?: boolean }
interface Conversation { id: string; title: string; createdAt: number; updatedAt: number; messages: ChatMessage[] }
interface Usage { startedAt: string; requests: number; successes: number; failures: number; failovers: number; averageLatencyMs: number; providers: Array<{ provider: string; requests: number; successes: number; failures: number; averageLatencyMs: number }> }
interface ComparisonResult { ok: boolean; provider: string; accountId: string; model: string; latencyMs: number; text?: string; reason?: string }

const STORAGE_KEY = "fate-ai-conversations-v1";
const ACCENTS: Record<string, string> = { openai: "#53d39d", groq: "#f28b55", gemini: "#55a7f3", anthropic: "#d49a62" };
const navGroups: { label: string; items: { name: WorkspaceView; icon: typeof MessageSquareText }[] }[] = [
  { label: "Workspace", items: [{ name: "Chat", icon: MessageSquareText }, { name: "Compare models", icon: SplitSquareVertical }, { name: "Coding agent", icon: Code2 }] },
  { label: "Manage", items: [{ name: "Provider vault", icon: KeyRound }, { name: "Usage & cost", icon: BarChart3 }] },
];

function uid() { return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2); }
function newConversation(): Conversation { const now = Date.now(); return { id: uid(), title: "New conversation", createdAt: now, updatedAt: now, messages: [] }; }
function providerColor(provider: string) { return ACCENTS[provider.toLowerCase()] ?? "#8b6cff"; }
function ProviderMark({ provider, compact = false }: { provider: string; compact?: boolean }) {
  return <div className={compact ? "provider-mark compact" : "provider-mark"} style={{ "--provider": providerColor(provider) } as React.CSSProperties}>{provider.slice(0, 1).toUpperCase()}</div>;
}

function Sidebar({ active, onChange, mobileOpen, onClose, providers, conversations, selectedId, onSelect, onNew, onDelete }: {
  active: WorkspaceView; onChange: (view: WorkspaceView) => void; mobileOpen: boolean; onClose: () => void;
  providers: RuntimeProvider[]; conversations: Conversation[]; selectedId: string; onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void;
}) {
  return <>
    <button className={"sidebar-scrim " + (mobileOpen ? "show" : "")} aria-label="Close menu" onClick={onClose} />
    <aside className={"sidebar " + (mobileOpen ? "mobile-open" : "")}>
      <div className="brand-row"><div className="brand-symbol"><Sparkles size={18} /></div><div><strong>FATE</strong><span>AI WORKSPACE</span></div><button className="mobile-close" onClick={onClose}><X size={18} /></button></div>
      <button className="new-chat" onClick={onNew}><Plus size={17} /> New chat <kbd>Ctrl K</kbd></button>
      <nav>{navGroups.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({ name, icon: Icon }) => <button key={name} className={active === name ? "nav-item active" : "nav-item"} onClick={() => { onChange(name); onClose(); }}><Icon size={17} /><span>{name}</span>{name === "Coding agent" && <small>Preview</small>}</button>)}</div>)}</nav>
      <div className="history-list"><p>Recent chats</p>{conversations.slice(0, 6).map((item) => <div className={item.id === selectedId && active === "Chat" ? "history-item active" : "history-item"} key={item.id}><button onClick={() => { onSelect(item.id); onClose(); }}><MessageSquareText size={14} /><span>{item.title}</span></button><button aria-label="Delete chat" onClick={() => onDelete(item.id)}><Trash2 size={13} /></button></div>)}</div>
      <div className="sidebar-bottom"><div className={"security-note " + (providers.length ? "connected" : "")}><ShieldCheck size={17} /><div><strong>{providers.length ? "Provider runtime active" : "No provider configured"}</strong><span>{providers.length ? `${providers.length} secure route${providers.length === 1 ? "" : "s"} ready` : "Add a server-side key in .env"}</span></div></div><div className="profile-row"><div className="avatar">M</div><div><strong>Manav</strong><span>Local workspace</span></div><MoreHorizontal size={18} /></div></div>
    </aside>
  </>;
}

function Topbar({ title, connected, onMenu, onSearch, onSettings }: { title: string; connected: boolean; onMenu: () => void; onSearch: () => void; onSettings: () => void }) {
  return <header className="topbar"><button className="menu-button" onClick={onMenu}><Menu size={20} /></button><div><h1>{title}</h1><p>Official APIs · automatic failover · local-first history</p></div><div className="top-actions"><button className="command-search" onClick={onSearch}><Search size={15} /><span>Search chats</span><kbd>Ctrl /</kbd></button><div className="router-chip"><span className={connected ? "" : "offline-dot"} /> Smart router <ChevronDown size={14} /></div><button className="icon-button" aria-label="Settings" onClick={onSettings}><Settings2 size={18} /></button></div></header>;
}

function ChatView({ conversation, providers, onUpdate, onCompare }: { conversation: Conversation; providers: RuntimeProvider[]; onUpdate: (messages: ChatMessage[]) => void; onCompare: (prompt: string) => void }) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  const messages = conversation.messages;
  const lastRoute = [...messages].reverse().find((item) => item.route)?.route;
  useEffect(() => { messageEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, pending]);

  async function sendText(value: string) {
    const prompt = value.trim();
    if (!prompt || pending) return;
    const next = [...messages, { id: uid(), role: "user" as const, text: prompt }];
    onUpdate(next); setDraft(""); setPending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, content: text })) }) });
      const body = await response.json() as { message?: string; error?: string; route?: RuntimeRoute };
      if (!response.ok || !body.message) throw new Error(body.error || "Provider returned no response");
      onUpdate([...next, { id: uid(), role: "assistant", text: body.message, route: body.route }]);
    } catch (error) {
      onUpdate([...next, { id: uid(), role: "assistant", text: error instanceof Error ? error.message : "Connection failed", error: true }]);
    } finally { setPending(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void sendText(draft); }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendText(draft); } }
  async function copy(text: string) { await navigator.clipboard.writeText(text); }
  function regenerate() { const lastUser = [...messages].reverse().find((item) => item.role === "user"); if (lastUser) void sendText(lastUser.text); }

  return <div className="chat-layout"><main className="conversation"><div className="conversation-heading"><div><span className="eyebrow">ACTIVE SESSION</span><h2>{conversation.title}</h2></div><div className="runtime-ready"><span className={providers.length ? "" : "offline-dot"} /> {providers.length} route{providers.length === 1 ? "" : "s"} ready</div></div>
    <div className="messages">{messages.length === 0 && <div className="empty-chat"><div><Sparkles size={22} /></div><h3>What should we work on?</h3><p>Ask anything. Chat history stays in this browser and provider credentials remain on the server.</p><div className="prompt-chips">{["Write a 7-day launch plan", "Review my product idea", "Create a landing-page brief"].map((text) => <button key={text} onClick={() => void sendText(text)}>{text}</button>)}</div></div>}
      {messages.length > 0 && <div className="date-divider"><span>Today</span></div>}
      {messages.map((message) => <article className={"message " + message.role + (message.error ? " error" : "")} key={message.id}>{message.role === "assistant" && <div className="assistant-avatar"><Sparkles size={16} /></div>}<div><div className="message-meta">{message.role === "assistant" ? <><strong>FATE</strong><span>{message.route ? `via ${message.route.provider.toUpperCase()} · ${message.route.model}` : "Router error"}</span></> : <strong>You</strong>}</div><p>{message.text}</p>{message.role === "assistant" && !message.error && <div className="answer-actions"><button onClick={() => void copy(message.text)}><Clipboard size={12} /> Copy</button><button onClick={regenerate}>Regenerate</button><button onClick={() => onCompare([...messages].reverse().find((item) => item.role === "user")?.text ?? "")}>Compare</button></div>}</div></article>)}
      {pending && <div className="thinking"><Activity className="spin" size={15} /> Routing to the best available provider…</div>}
      <div ref={messageEnd} />
      {messages.length > 0 && <section className="route-insight"><div className="insight-icon"><Zap size={17} /></div><div><span>ROUTING INSIGHT</span><strong>{lastRoute ? `${lastRoute.provider.toUpperCase()} completed the latest response` : "Waiting for a successful route"}</strong><p>{lastRoute?.failedAttempts ? `${lastRoute.failedAttempts} route(s) failed before automatic recovery.` : "Context is preserved if the router needs the next account."}</p></div>{lastRoute && <span className="healthy-label"><i /> {lastRoute.latencyMs ? `${lastRoute.latencyMs} ms` : "Healthy"}</span>}</section>}
    </div>
    <form className="composer" onSubmit={submit}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} placeholder={providers.length ? "Message FATE AI…" : "Configure a provider key in .env to start chatting…"} rows={2} /><div className="composer-tools"><span>Enter to send · Shift+Enter for line break</span><button className="send-button" aria-label="Send message" disabled={pending || !draft.trim() || !providers.length}>{pending ? <Activity className="spin" size={18} /> : <ArrowUp size={18} />}</button></div></form>
  </main><aside className="context-panel"><section><span className="eyebrow">RUN DETAILS</span><div className="active-provider"><ProviderMark provider={lastRoute?.provider || providers[0]?.provider || "?"} /><div><strong>{lastRoute?.model || providers[0]?.model || "No provider configured"}</strong><span>{lastRoute?.provider || providers[0]?.provider || "Add a key in .env"}</span></div>{providers.length > 0 && <i className="status-dot healthy" />}</div></section><section><div className="section-label"><span>Session messages</span><strong>{messages.length}</strong></div><div className="progress"><i style={{ width: Math.min(100, messages.length * 5) + "%" }} /></div></section><section><span className="eyebrow">FAILOVER CHAIN</span><div className="route-list">{providers.map((provider, index) => <div className={lastRoute?.accountId === provider.id ? "route-step active" : "route-step ready"} key={provider.id}><div className="route-index">{index + 1}</div><div><strong>{provider.provider.toUpperCase()}</strong><span>{provider.model} · priority {provider.priority}</span></div></div>)}{!providers.length && <p className="no-routes">No provider accounts detected.</p>}</div></section><div className="vault-note"><ShieldCheck size={18} /><div><strong>Credential-safe design</strong><span>Keys load server-side only and never enter browser storage or chat history.</span></div></div></aside></div>;
}

function ProviderVault({ providers, onRefresh }: { providers: RuntimeProvider[]; onRefresh: () => void }) {
  return <div className="page-scroll"><div className="page-title"><div><span className="eyebrow">CONNECTIONS</span><h2>Provider vault</h2><p>Configured server-side accounts in automatic routing order.</p></div><button className="secondary-button" onClick={onRefresh}><Activity size={16} /> Refresh</button></div><div className="metric-grid"><div className="metric-card"><strong>{providers.length}</strong><span>Connected accounts</span></div><div className="metric-card"><strong>{new Set(providers.map((item) => item.provider)).size}</strong><span>Providers</span></div><div className="metric-card"><strong>{providers.length ? "Active" : "Setup"}</strong><span>Router status</span></div><div className="metric-card"><strong>Server</strong><span>Credential location</span></div></div><div className="section-heading"><div><h3>Routing pool</h3><p>Lower priority numbers run first</p></div></div><div className="provider-table">{providers.map((provider, index) => <div className="provider-row live-provider-row" key={provider.id}><span className="priority-number">{String(index + 1).padStart(2, "0")}</span><ProviderMark provider={provider.provider} /><div className="provider-name"><strong>{provider.provider.toUpperCase()}</strong><span>{provider.id}</span></div><div className="provider-model"><small>MODEL</small><strong>{provider.model}</strong></div><div className="health-cell"><i className="status-dot healthy" /><span>ready</span></div><span className={index === 0 ? "role-badge primary" : "role-badge standby"}>{index === 0 ? "primary" : "standby"}</span></div>)}{!providers.length && <div className="empty-state"><KeyRound size={26} /><h3>No provider connected</h3><p>Add GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY to .env and restart the server.</p></div>}</div><section className="policy-card"><div><span className="eyebrow">SECURE SETUP</span><h3>Keys stay outside the browser</h3><p>FATE reads credentials from your server environment. This prevents API keys from being exposed in page source or local storage.</p></div><div className="setup-code"><code>GROQ_API_KEY=your_key_here</code><span>Restart with npm run dev after editing .env</span></div></section></div>;
}

function CompareModels({ providers, initialPrompt, onUse }: { providers: RuntimeProvider[]; initialPrompt: string; onUse: (text: string) => void }) {
  const [prompt, setPrompt] = useState(initialPrompt || "Explain the strongest launch strategy for FATE AI.");
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  async function run(event?: FormEvent) { event?.preventDefault(); if (!prompt.trim() || loading || !providers.length) return; setLoading(true); setResults([]); try { const response = await fetch("/api/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt.trim() }] }) }); const body = await response.json() as { results?: ComparisonResult[]; error?: string }; if (!body.results) throw new Error(body.error || "Comparison failed"); setResults(body.results); } catch (error) { setResults([{ ok: false, provider: "router", accountId: "router", model: "—", latencyMs: 0, reason: error instanceof Error ? error.message : "Comparison failed" }]); } finally { setLoading(false); } }
  return <div className="page-scroll"><div className="page-title"><div><span className="eyebrow">SIDE-BY-SIDE</span><h2>Compare models</h2><p>One prompt, up to three configured accounts, real parallel responses.</p></div></div><form className="comparison-prompt" onSubmit={run}><Command size={18} /><input value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Comparison prompt" /><button disabled={loading || !providers.length}>{loading ? <Activity className="spin" size={17} /> : <ArrowUp size={17} />}</button></form>{!results.length && <div className="compare-empty"><SplitSquareVertical size={28} /><h3>{providers.length > 1 ? "Ready to compare" : providers.length === 1 ? "One route is connected" : "No routes connected"}</h3><p>{providers.length > 1 ? "Send the prompt to compare tone, accuracy, and speed." : "Add more provider accounts for a useful side-by-side comparison."}</p></div>}<div className="comparison-grid">{results.map((result) => <article className={"comparison-card " + (!result.ok ? "failed" : "")} key={result.accountId}><header><ProviderMark provider={result.provider} /><div><strong>{result.model}</strong><span>{result.provider.toUpperCase()} · {result.accountId}</span></div><i className={result.ok ? "status-dot healthy" : "status-dot offline"} /></header><p>{result.ok ? result.text : result.reason}</p><footer><span>{result.latencyMs} ms</span>{result.ok && result.text && <button onClick={() => onUse(result.text!)}>Continue in chat</button>}</footer></article>)}</div></div>;
}

function UsageView({ usage, onRefresh }: { usage: Usage | null; onRefresh: () => void }) {
  const successRate = usage?.requests ? Math.round((usage.successes / usage.requests) * 100) : 0;
  return <div className="page-scroll"><div className="page-title"><div><span className="eyebrow">OBSERVABILITY</span><h2>Usage & reliability</h2><p>Real activity since the current server process started. Provider billing is not estimated.</p></div><button className="secondary-button" onClick={onRefresh}><Activity size={16} /> Refresh</button></div><div className="metric-grid"><div className="metric-card"><strong>{usage?.requests ?? 0}</strong><span>Requests</span></div><div className="metric-card"><strong>{successRate}%</strong><span>Success rate</span></div><div className="metric-card"><strong>{usage?.averageLatencyMs ?? 0} ms</strong><span>Average latency</span></div><div className="metric-card"><strong>{usage?.failovers ?? 0}</strong><span>Failed route attempts</span></div></div><div className="usage-card"><div className="section-heading"><div><h3>Provider activity</h3><p>{usage ? `Tracking since ${new Date(usage.startedAt).toLocaleString()}` : "Loading runtime metrics…"}</p></div></div>{usage?.providers.length ? usage.providers.map((provider) => <div className="usage-row usage-live" key={provider.provider}><ProviderMark provider={provider.provider} compact /><strong>{provider.provider.toUpperCase()}</strong><div><span>{provider.successes} successful · {provider.failures} failed</span><div className="usage-bar"><i style={{ width: `${provider.requests ? (provider.successes / provider.requests) * 100 : 0}%`, background: providerColor(provider.provider) }} /></div></div><span>{provider.averageLatencyMs} ms</span></div>) : <div className="empty-state"><BarChart3 size={25} /><h3>No activity yet</h3><p>Send a chat or comparison to start collecting runtime metrics.</p></div>}</div></div>;
}

function CodingAgent() {
  return <div className="agent-grid"><aside className="file-panel"><div className="panel-title"><span>EXPLORER PREVIEW</span><MoreHorizontal size={16} /></div><strong className="repo-name"><GitBranch size={15} /> Connect a repository</strong><div className="file-tree"><span>Repository files appear here</span><span>after a sandbox runner is connected.</span></div></aside><section className="editor-panel"><div className="editor-tabs"><span className="active">agent-readme.md</span></div><div className="code-window"><pre><code>{`# FATE Coding Agent\n\nStatus: Preview only\n\nPlanned safety model:\n- isolated workspace\n- explicit command approval\n- reviewable diff\n- tests before publish\n\nNo code is being executed from this screen.`}</code></pre></div><div className="terminal-panel"><div><Code2 size={15} /><strong>Runner status</strong></div><pre>$ Sandbox runner is not connected</pre></div></section><aside className="agent-panel"><div className="agent-heading"><span className="eyebrow">CODING AGENT</span><span className="idle-badge">PREVIEW</span></div><h2>Safe repository work</h2><p>The interface is ready, but execution stays disabled until an isolated runner, approval controls, and repository permissions are implemented.</p><div className="agent-plan">{["Connect GitHub repository", "Create isolated workspace", "Approve commands", "Review and publish diff"].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong></div>)}</div><button className="primary-button agent-run" disabled><ShieldCheck size={17} /> Runner not connected</button><div className="approval-note"><ShieldCheck size={17} /><span>FATE will never claim a coding task ran when no sandbox execution happened.</span></div></aside></div>;
}

function SettingsModal({ onClose, conversations, onClear }: { onClose: () => void; conversations: Conversation[]; onClear: () => void }) {
  function exportData() { const blob = new Blob([JSON.stringify(conversations, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "fate-ai-chats.json"; anchor.click(); URL.revokeObjectURL(url); }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">WORKSPACE</span><h2>Settings</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header><div className="settings-row"><div><strong>Local chat history</strong><span>{conversations.length} conversation(s) stored in this browser</span></div><button className="secondary-button" onClick={exportData}><Download size={15} /> Export</button></div><div className="settings-row danger-row"><div><strong>Clear chat history</strong><span>This cannot be undone.</span></div><button className="secondary-button" onClick={onClear}><Trash2 size={15} /> Clear</button></div><div className="vault-note"><ShieldCheck size={18} /><div><strong>API credentials are not stored here</strong><span>Manage provider keys only through the server .env file.</span></div></div></section></div>;
}

export default function App() {
  const [active, setActive] = useState<WorkspaceView>("Chat");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [providers, setProviders] = useState<RuntimeProvider[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [comparePrompt, setComparePrompt] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Conversation[]; return saved.length ? saved : [newConversation()]; } catch { return [newConversation()]; } });
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  const searchRef = useRef<HTMLInputElement>(null);

  function refreshProviders() { fetch("/api/providers").then((response) => response.json()).then((body: { providers?: RuntimeProvider[] }) => setProviders(body.providers ?? [])).catch(() => setProviders([])); }
  function refreshUsage() { fetch("/api/usage").then((response) => response.json()).then((body: Usage) => setUsage(body)).catch(() => setUsage(null)); }
  useEffect(refreshProviders, []);
  useEffect(refreshUsage, [active]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { const listener = (event: globalThis.KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); createChat(); } if ((event.ctrlKey || event.metaKey) && event.key === "/") { event.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current?.focus()); } if (event.key === "Escape") { setSettingsOpen(false); setSearchOpen(false); } }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); });
  function createChat() { const fresh = newConversation(); setConversations((current) => [fresh, ...current]); setSelectedId(fresh.id); setActive("Chat"); setMobileOpen(false); }
  function updateMessages(messages: ChatMessage[]) { setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, title: messages.find((message) => message.role === "user")?.text.slice(0, 46) || "New conversation", updatedAt: Date.now(), messages } : item).sort((a, b) => b.updatedAt - a.updatedAt)); }
  function deleteChat(id: string) { setConversations((current) => { const remaining = current.filter((item) => item.id !== id); const next = remaining.length ? remaining : [newConversation()]; if (id === selectedId) setSelectedId(next[0].id); return next; }); }
  function clearChats() { const fresh = newConversation(); setConversations([fresh]); setSelectedId(fresh.id); setSettingsOpen(false); }
  function selectChat(id: string) { setSelectedId(id); setActive("Chat"); }
  function startCompare(prompt: string) { setComparePrompt(prompt); setActive("Compare models"); }
  function useComparison(text: string) { const fresh = newConversation(); fresh.messages = [{ id: uid(), role: "assistant", text }]; fresh.title = "Comparison result"; setConversations((current) => [fresh, ...current]); setSelectedId(fresh.id); setActive("Chat"); }
  const filtered = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase())), [conversations, searchQuery]);

  return <div className="app-shell"><Sidebar active={active} onChange={setActive} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} providers={providers} conversations={conversations} selectedId={selectedId} onSelect={selectChat} onNew={createChat} onDelete={deleteChat} /><section className="workspace"><Topbar title={active} connected={providers.length > 0} onMenu={() => setMobileOpen(true)} onSearch={() => setSearchOpen(true)} onSettings={() => setSettingsOpen(true)} /><div className="workspace-content">{active === "Chat" && <ChatView conversation={selected} providers={providers} onUpdate={updateMessages} onCompare={startCompare} />}{active === "Provider vault" && <ProviderVault providers={providers} onRefresh={refreshProviders} />}{active === "Compare models" && <CompareModels providers={providers} initialPrompt={comparePrompt} onUse={useComparison} />}{active === "Usage & cost" && <UsageView usage={usage} onRefresh={refreshUsage} />}{active === "Coding agent" && <CodingAgent />}</div></section>
    {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} conversations={conversations} onClear={clearChats} />}
    {searchOpen && <div className="modal-backdrop search-backdrop" onMouseDown={() => setSearchOpen(false)}><section className="search-modal" onMouseDown={(event) => event.stopPropagation()}><div><Search size={17} /><input ref={searchRef} value={searchQuery} placeholder="Search chat titles…" onChange={(event) => setSearchQuery(event.target.value)} /><kbd>Esc</kbd></div>{filtered.map((item) => <button key={item.id} onClick={() => { selectChat(item.id); setSearchOpen(false); }}><MessageSquareText size={15} /><span>{item.title}</span></button>)}</section></div>}
  </div>;
}
