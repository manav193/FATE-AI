import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowUp,
  Bot,
  Braces,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Command,
  GitBranch,
  KeyRound,
  Layers3,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  SplitSquareVertical,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";
import { providerAccounts, routeEvents } from "./data/providers";
import type { ProviderAccount, WorkspaceView } from "./types";

const navGroups: { label: string; items: { name: WorkspaceView; icon: typeof MessageSquareText }[] }[] = [
  {
    label: "Workspace",
    items: [
      { name: "Chat", icon: MessageSquareText },
      { name: "Compare models", icon: SplitSquareVertical },
      { name: "Coding agent", icon: Code2 },
    ],
  },
  {
    label: "Manage",
    items: [
      { name: "Provider vault", icon: KeyRound },
      { name: "Usage & cost", icon: CircleDollarSign },
    ],
  },
];

function ProviderMark({ account, compact = false }: { account: ProviderAccount; compact?: boolean }) {
  return (
    <div className={compact ? "provider-mark compact" : "provider-mark"} style={{ "--provider": account.accent } as React.CSSProperties}>
      {account.provider.slice(0, 1)}
    </div>
  );
}

function StatusDot({ status }: { status: ProviderAccount["health"] }) {
  return <span className={"status-dot " + status} aria-label={status} />;
}

function Sidebar({
  active,
  onChange,
  mobileOpen,
  onClose,
}: {
  active: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <button className={"sidebar-scrim " + (mobileOpen ? "show" : "")} aria-label="Close menu" onClick={onClose} />
      <aside className={"sidebar " + (mobileOpen ? "mobile-open" : "")}>
        <div className="brand-row">
          <div className="brand-symbol"><Sparkles size={18} /></div>
          <div><strong>FATE</strong><span>AI WORKSPACE</span></div>
          <button className="mobile-close" onClick={onClose}><X size={18} /></button>
        </div>

        <button className="new-chat" onClick={() => onChange("Chat")}><Plus size={17} /> New chat <kbd>⌘ K</kbd></button>

        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  className={active === name ? "nav-item active" : "nav-item"}
                  onClick={() => { onChange(name); onClose(); }}
                >
                  <Icon size={17} />
                  <span>{name}</span>
                  {name === "Coding agent" && <small>Beta</small>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-note"><ShieldCheck size={17} /><div><strong>Local demo mode</strong><span>No credentials connected</span></div></div>
          <div className="profile-row"><div className="avatar">M</div><div><strong>Manav</strong><span>Personal workspace</span></div><MoreHorizontal size={18} /></div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu}><Menu size={20} /></button>
      <div><h1>{title}</h1><p>Official provider connections · policy-aware routing</p></div>
      <div className="top-actions">
        <button className="command-search"><Search size={15} /><span>Search</span><kbd>⌘ /</kbd></button>
        <button className="router-chip"><span /> Smart router <ChevronDown size={14} /></button>
        <button className="icon-button" aria-label="Settings"><Settings2 size={18} /></button>
      </div>
    </header>
  );
}

function ChatView() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "user",
      text: "Create a focused launch strategy for a reliable multi-model AI workspace.",
    },
    {
      id: 2,
      role: "assistant",
      text: "Position it as continuity infrastructure, not another generic AI wrapper. The strongest wedge is transparent routing, provider redundancy, preserved context, and controlled cost.",
    },
  ]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: value }]);
    setDraft("");
  }

  return (
    <div className="chat-layout">
      <main className="conversation">
        <div className="conversation-heading">
          <div><span className="eyebrow">ACTIVE SESSION</span><h2>Launch strategy</h2></div>
          <div className="model-stack">
            {providerAccounts.slice(0, 3).map((account) => <ProviderMark key={account.id} account={account} compact />)}
            <span>3 routes ready</span>
          </div>
        </div>

        <div className="messages">
          <div className="date-divider"><span>Today</span></div>
          {messages.map((message) => (
            <article className={"message " + message.role} key={message.id}>
              {message.role === "assistant" && <div className="assistant-avatar"><Sparkles size={16} /></div>}
              <div>
                <div className="message-meta">
                  {message.role === "assistant" ? <><strong>FATE</strong><span>via OpenAI · Production 01</span></> : <strong>You</strong>}
                </div>
                <p>{message.text}</p>
                {message.role === "assistant" && (
                  <div className="answer-actions"><button>Copy</button><button>Regenerate</button><button>Compare</button></div>
                )}
              </div>
            </article>
          ))}

          <section className="route-insight">
            <div className="insight-icon"><Zap size={17} /></div>
            <div><span>ROUTING INSIGHT</span><strong>Context checkpoint is ready</strong><p>If the primary account fails, the next response can continue through Google AI without losing this session.</p></div>
            <span className="healthy-label"><i /> Healthy</span>
          </section>
        </div>

        <form className="composer" onSubmit={submit}>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything, compare models, or start a coding task…" rows={2} />
          <div className="composer-tools">
            <div><button type="button"><Paperclip size={16} /> Attach</button><button type="button"><Layers3 size={16} /> Tools</button><button type="button" className="mode-button"><Sparkles size={15} /> Balanced <ChevronDown size={14} /></button></div>
            <button className="send-button" aria-label="Send message"><ArrowUp size={18} /></button>
          </div>
        </form>
      </main>

      <aside className="context-panel">
        <section><span className="eyebrow">RUN DETAILS</span><div className="active-provider"><ProviderMark account={providerAccounts[0]} /><div><strong>{providerAccounts[0].model}</strong><span>{providerAccounts[0].accountName}</span></div><StatusDot status="healthy" /></div></section>
        <section><div className="section-label"><span>Context</span><strong>46K / 128K</strong></div><div className="progress"><i style={{ width: "36%" }} /></div></section>
        <section><span className="eyebrow">FAILOVER CHAIN</span><div className="route-list">{routeEvents.map((event, index) => <div className={"route-step " + event.state} key={event.id}><div className="route-index">{index + 1}</div><div><strong>{event.label}</strong><span>{event.reason}</span></div></div>)}</div></section>
        <section className="session-stats"><span><small>Cost so far</small><strong>$0.47</strong></span><span><small>Latency</small><strong>1.68s</strong></span></section>
        <div className="vault-note"><ShieldCheck size={18} /><div><strong>Credential-safe design</strong><span>Future keys stay encrypted server-side and never enter chat state.</span></div></div>
      </aside>
    </div>
  );
}

function ProviderVault() {
  const [threshold, setThreshold] = useState(10);
  return (
    <div className="page-scroll">
      <div className="page-title"><div><span className="eyebrow">CONNECTIONS</span><h2>Provider vault</h2><p>Connect official API credentials and set routing priority.</p></div><button className="primary-button"><Plus size={17} /> Connect provider</button></div>
      <div className="metric-grid">
        {[["4", "Providers"], ["4", "Accounts"], ["99.97%", "Pool availability"], ["$48.20", "Spend this month"]].map(([value, label]) => <div className="metric-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <div className="section-heading"><div><h3>Routing pool</h3><p>Priority order used by Smart Router</p></div><button className="secondary-button"><Activity size={16} /> Health check</button></div>
      <div className="provider-table">
        {providerAccounts.map((account, index) => (
          <div className="provider-row" key={account.id}>
            <span className="priority-number">0{index + 1}</span><ProviderMark account={account} />
            <div className="provider-name"><strong>{account.provider}</strong><span>{account.accountName}</span></div>
            <div className="provider-model"><small>MODEL</small><strong>{account.model}</strong></div>
            <div className="provider-budget"><div><small>BUDGET LEFT</small><strong>{account.remainingPercent}%</strong></div><div className="progress"><i style={{ width: account.remainingPercent + "%", background: account.accent }} /></div></div>
            <div className="health-cell"><StatusDot status={account.health} /><span>{account.health}</span></div>
            <span className={"role-badge " + account.role}>{account.role}</span><button className="row-menu"><MoreHorizontal size={18} /></button>
          </div>
        ))}
      </div>
      <section className="policy-card"><div><span className="eyebrow">FAILOVER POLICY</span><h3>Keep every task moving</h3><p>Switch to the next healthy account before a provider limit interrupts the response.</p></div><div className="policy-control"><label>Switch below <strong>{threshold}%</strong> remaining</label><input type="range" min="5" max="30" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /><div><span>Preserve context</span><b>ON</b></div></div></section>
    </div>
  );
}

function CodingAgent() {
  const [running, setRunning] = useState(false);
  return (
    <div className="agent-grid">
      <aside className="file-panel">
        <div className="panel-title"><span>EXPLORER</span><MoreHorizontal size={16} /></div>
        <strong className="repo-name"><GitBranch size={15} /> fate-ai / main</strong>
        <div className="file-tree">
          <span>▾ src</span><span className="nested">▾ server</span><span className="nested-2">provider-router.ts</span><span className="nested-2 selected">context-store.ts</span><span className="nested">▸ components</span><span>▸ tests</span><span>package.json</span><span>README.md</span>
        </div>
        <div className="task-list"><span className="eyebrow">AGENT TASKS</span><p><Check size={13} /> Inspect routing interfaces</p><p className={running ? "current" : ""}><Activity size={13} /> Implement failover</p><p><span className="empty-check" /> Run focused tests</p></div>
      </aside>
      <section className="editor-panel">
        <div className="editor-tabs"><span className="active">provider-router.ts <X size={13} /></span><span>router.test.ts</span></div>
        <div className="code-window">
          <pre><code>{`export async function route(request: AIRequest) {
  const candidates = await pool.rank({
    capability: request.capability,
    requireHealthy: true,
    respectBudget: true,
  });

  for (const account of candidates) {
    const result = await execute(account, request);

    if (result.ok) return result;

    await context.checkpoint({
      request,
      failedAccount: account.id,
    });
  }

  throw new RoutingError("No healthy route available");
}`}</code></pre>
        </div>
        <div className="terminal-panel"><div><TerminalSquare size={15} /><strong>Terminal</strong><span>Tests</span></div><pre>{running ? "$ npm test\n✓ preserves context on failover\n✓ skips unhealthy accounts\n✓ rejects browser credentials\n\n3 passed · 1.42s" : "$ Ready for an approved agent run"}</pre></div>
      </section>
      <aside className="agent-panel">
        <div className="agent-heading"><span className="eyebrow">CODING AGENT</span><span className={running ? "running-badge" : "idle-badge"}>{running ? "RUNNING" : "READY"}</span></div>
        <h2>Build resilient provider routing</h2><p>Work happens in an isolated branch. Review the diff before anything reaches main.</p>
        <div className="agent-plan">{["Inspect repository", "Implement ranked failover", "Run focused tests", "Prepare reviewable diff"].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong>{running && index < 3 && <Check size={15} />}</div>)}</div>
        <div className="change-card"><span>EXPECTED SCOPE</span><strong>4 files</strong><div><b>+128</b><em>−34</em></div></div>
        <button className="primary-button agent-run" onClick={() => setRunning((value) => !value)}>{running ? <><X size={17} /> Pause agent</> : <><Play size={17} /> Start safe run</>}</button>
        <div className="approval-note"><ShieldCheck size={17} /><span>Destructive commands and external writes require explicit approval.</span></div>
      </aside>
    </div>
  );
}

function CompareModels() {
  return (
    <div className="page-scroll">
      <div className="page-title"><div><span className="eyebrow">SIDE-BY-SIDE</span><h2>Compare models</h2><p>Send one prompt to selected routes and compare useful differences.</p></div><button className="primary-button"><Plus size={17} /> New comparison</button></div>
      <div className="comparison-prompt"><Command size={18} /><span>Design a secure multi-provider failover strategy for production.</span><button><ArrowUp size={17} /></button></div>
      <div className="comparison-grid">
        {providerAccounts.slice(0, 3).map((account, index) => <article className="comparison-card" key={account.id}><header><ProviderMark account={account} /><div><strong>{account.model}</strong><span>{account.provider} · {account.accountName}</span></div><StatusDot status={account.health} /></header><p>{index === 0 ? "Use a capability-aware router with server-side credentials, health scoring, idempotent retries, and context checkpoints." : index === 1 ? "Separate provider adapters from routing policy. Rank healthy candidates using latency, cost, remaining budget, and task capability." : "Treat failover as a state machine. Persist only the minimum resumable context and audit every routing decision."}</p><footer><span>{account.latencyMs} ms</span><button>Use response</button></footer></article>)}
      </div>
    </div>
  );
}

function UsageView() {
  const totalRemaining = useMemo(() => Math.round(providerAccounts.reduce((sum, item) => sum + item.remainingPercent, 0) / providerAccounts.length), []);
  return (
    <div className="page-scroll">
      <div className="page-title"><div><span className="eyebrow">OBSERVABILITY</span><h2>Usage & cost</h2><p>Track budgets without pretending consumer-plan limits are API balances.</p></div></div>
      <div className="metric-grid"><div className="metric-card"><strong>$48.20</strong><span>Current API spend</span></div><div className="metric-card"><strong>1,284</strong><span>Routed requests</span></div><div className="metric-card"><strong>{totalRemaining}%</strong><span>Average budget remaining</span></div><div className="metric-card"><strong>17</strong><span>Successful failovers</span></div></div>
      <div className="usage-card"><div className="section-heading"><div><h3>Provider allocation</h3><p>Demo distribution for the current month</p></div></div>{providerAccounts.map((account) => <div className="usage-row" key={account.id}><ProviderMark account={account} compact /><strong>{account.provider}</strong><div className="usage-bar"><i style={{ width: account.remainingPercent + "%", background: account.accent }} /></div><span>{account.remainingPercent}%</span></div>)}</div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState<WorkspaceView>("Chat");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <section className="workspace">
        <Topbar title={active} onMenu={() => setMobileOpen(true)} />
        <div className="workspace-content">
          {active === "Chat" && <ChatView />}
          {active === "Provider vault" && <ProviderVault />}
          {active === "Coding agent" && <CodingAgent />}
          {active === "Compare models" && <CompareModels />}
          {active === "Usage & cost" && <UsageView />}
        </div>
      </section>
    </div>
  );
}
