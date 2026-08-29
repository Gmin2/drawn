import { useState } from "react";
import { useEffect } from "react";
import {
  createSession,
  listSessions,
  loadSession,
  runApproval,
  runTurn,
  type RequiredAction,
  type SessionSummary,
  type TurnEvent,
} from "./lib/trueforge";
import { OptionList, type Option } from "./components/OptionList";
import { DetailCard, type Field } from "./components/DetailCard";
import { TicketCard, type Endpoint } from "./components/TicketCard";
import { ConfirmCard } from "./components/ConfirmCard";
import { ToolChip } from "./components/ToolChip";
import { Shell } from "./components/Shell";
import { LoadingState } from "./components/LoadingState";
import type { SessionItem } from "./components/SidebarNav";

const AGENT = "genui-flights";

const CONNECTORS = [
  { name: "flights", note: "public" },
  { name: "github", note: "header auth" },
  { name: "render-kit", note: "local" },
];

const PROMPTS = [
  { id: "sfo-jfk", label: "SFO to JFK in September", prompt: "Find me flights from SFO to JFK on 2026-09-20" },
  { id: "lhr-cdg", label: "London to Paris next month", prompt: "Find flights from LHR to CDG on 2026-10-05" },
  { id: "cheapest", label: "Cheapest dates to Lisbon", prompt: "What are the cheapest dates to fly from LHR to LIS in October 2026?" },
  { id: "nonstop", label: "Nonstop only, SFO to Tokyo", prompt: "Find nonstop flights from SFO to HND on 2026-11-12" },
  { id: "issues", label: "Open issues on trueforge", prompt: "Show me the open issues on truefoundry/trueforge" },
];

type Bubble =
  | { kind: "user"; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; id: string; name: string; args: Record<string, unknown> }
  | { kind: "error"; text: string };

// Once any connector is deferred, the harness routes every call through
// `call_tool` as {mcp_server, tool_name, input}. Unwrap that so the renderer
// keys off the tool the agent actually meant, in either mode. `list_tools` and
// `get_tool_info` are the harness discovering itself — not worth showing.
const PLUMBING = new Set(["list_tools", "get_tool_info"]);

function unwrap(name: string, args: Record<string, unknown>) {
  if (name !== "call_tool") return { name, args };
  const inner = args.tool_name;
  if (typeof inner !== "string") return { name, args };
  const input = args.input;
  return {
    name: inner,
    args: (input && typeof input === "object" ? input : {}) as Record<string, unknown>,
  };
}

function eventsToBubbles(events: TurnEvent[]): Bubble[] {
  const out: Bubble[] = [];
  for (const e of events) {
    if (e.type !== "model.message") continue;
    if (e.content) out.push({ kind: "text", text: e.content });
    for (const tc of e.tool_calls ?? []) {
      let raw: Record<string, unknown> = {};
      try {
        raw = JSON.parse(tc.function.arguments);
      } catch {
        raw = { raw: tc.function.arguments };
      }
      if (PLUMBING.has(tc.function.name)) continue;
      const { name, args } = unwrap(tc.function.name, raw);
      out.push({ kind: "tool", id: tc.id, name, args });
    }
  }
  return out;
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pending, setPending] = useState<RequiredAction[]>([]);
  const [decided, setDecided] = useState<Record<string, "allow" | "deny">>({});
  const [input, setInput] = useState("Find me flights from SFO to JFK on 2026-09-20");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  async function refreshSessions() {
    try {
      setSessions(await listSessions());
    } catch {
      // the list is a convenience; a failure here should not break the chat
    }
  }

  useEffect(() => {
    void refreshSessions();
  }, []);

  function absorb(turn: Awaited<ReturnType<typeof runTurn>>) {
    if (turn.status === "error") {
      setBubbles((b) => [...b, { kind: "error", text: turn.message ?? "turn failed" }]);
      return;
    }
    setBubbles((b) => [...b, ...eventsToBubbles(turn.events)]);
    setPending(turn.requiredActions);
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setBubbles((b) => [...b, { kind: "user", text }]);
    setInput("");
    try {
      let sid = sessionId;
      if (!sid) {
        sid = (await createSession(AGENT)).id;
        setSessionId(sid);
      }
      absorb(await runTurn(sid, text));
      void refreshSessions();
    } catch (err) {
      setBubbles((b) => [
        ...b,
        { kind: "error", text: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function decide(toolCallId: string, approved: boolean) {
    const action = pending.find((a) => a.tool_calls.some((t) => t.id === toolCallId));
    if (!action || !sessionId || busy) return;
    const status = approved ? "allow" : "deny";
    setDecided((d) => ({ ...d, [toolCallId]: status }));
    setPending((p) => p.filter((a) => a !== action));
    setBusy(true);
    try {
      absorb(await runApproval(sessionId, action.thread_id, toolCallId, status));
    } catch (err) {
      setBubbles((b) => [
        ...b,
        { kind: "error", text: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // The generative-UI mechanism is this switch: the agent names a component and
  // hands it props. Nothing here knows what a flight is. An unmapped tool falls
  // through to its raw payload rather than disappearing.
  function renderTool(b: Extract<Bubble, { kind: "tool" }>) {
    const { args } = b;

    if (b.name === "render_options" || b.name === "render_list") {
      const pickable = b.name === "render_options";
      return (
        <OptionList
          title={args.title as string}
          options={args.options as Option[]}
          disabled={busy}
          onPick={
            pickable
              ? (option) =>
                  send(
                    `I'll take the ${option.primary} flight${
                      option.secondary ? ` on ${option.secondary}` : ""
                    }${option.value ? ` for ${option.value}` : ""}.`,
                  )
              : undefined
          }
        />
      );
    }

    if (b.name === "render_detail") {
      if (args.variant === "ticket" && args.endpoints) {
        return (
          <TicketCard
            title={args.title as string}
            subtitle={args.subtitle as string | undefined}
            endpoints={args.endpoints as { from: Endpoint; to: Endpoint }}
            fields={(args.fields as Field[]) ?? []}
            badges={args.badges as string[] | undefined}
            body={args.body as string | undefined}
          />
        );
      }
      return (
        <DetailCard
          title={args.title as string}
          subtitle={args.subtitle as string | undefined}
          fields={(args.fields as Field[]) ?? []}
          body={args.body as string | undefined}
          badges={args.badges as string[] | undefined}
        />
      );
    }

    if (b.name === "render_confirm") {
      const isPending = pending.some((a) => a.tool_calls.some((t) => t.id === b.id));
      return (
        <ConfirmCard
          title={args.title as string}
          summary={args.summary as string}
          consequence={args.consequence as string}
          confirmLabel={(args.confirmLabel as string) ?? "Confirm"}
          fields={(args.fields as Field[]) ?? []}
          settled={isPending ? undefined : decided[b.id]}
          onDecide={(approved) => decide(b.id, approved)}
        />
      );
    }

    return <ToolChip name={b.name} args={args} />;
  }

  async function open(session: SessionSummary) {
    if (busy) return;
    setBusy(true);
    try {
      const replay = await loadSession(session.id);
      const next: Bubble[] = [];
      for (const turn of replay.turns) {
        for (const text of turn.userMessages) next.push({ kind: "user", text });
        next.push(...eventsToBubbles(turn.events));
      }
      setSessionId(session.id);
      setBubbles(next);
      setPending(replay.requiredActions);
      setDecided({});
      localStorage.setItem("genui:last-session", session.id);
    } catch (err) {
      setBubbles([
        { kind: "error", text: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSessionId(null);
    setBubbles([]);
    setPending([]);
    setDecided({});
  }

  const turns = bubbles.filter((b) => b.kind === "user").length;

  return (
    <Shell
      onReset={reset}
      turns={turns}
      sessions={sessions}
      connectors={CONNECTORS}
      activeId={sessionId}
      onPick={(s: SessionItem) => void open(s)}
    >
      <div className="flex min-h-0 flex-1 flex-col px-12 py-9">
        <div className="mb-3 flex items-start gap-2 sm:items-baseline">
          <span className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-3)] sm:mt-0">
            01
          </span>
          <div className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
            <h3 className="text-[13px] font-semibold whitespace-nowrap text-[var(--ink)]">
              Live connectors
            </h3>
            <p className="mt-0.5 text-[12.5px] text-pretty text-[var(--ink-3)] sm:mt-0">
              Flights, GitHub and your own tools, drawn as interface instead of JSON.
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[var(--radius-window)] bg-[var(--canvas)] p-6">
          {bubbles.length === 0 ? (
            <div className="m-auto flex max-w-[380px] flex-col items-center gap-4">
              <p className="text-center text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                Ask for a route and a date. The agent calls the flight connector, then
                draws the results with its own components instead of describing them.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {PROMPTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => send(p.prompt)}
                    className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] shadow-[var(--shadow-btn)] transition-colors duration-150 hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bubbles.map((b, i) => (
                <div key={i}>
                  {b.kind === "user" && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[var(--radius-control)] bg-[var(--surface)] px-3 py-1.5 text-[13px] leading-5 text-[var(--ink)] shadow-[var(--shadow-hairline)]">
                        {b.text}
                      </div>
                    </div>
                  )}
                  {b.kind === "text" && (
                    <div className="text-[13px] leading-[22px] whitespace-pre-wrap text-[var(--ink-2)]">
                      {b.text}
                    </div>
                  )}
                  {b.kind === "error" && (
                    <div className="rounded-[var(--radius-card)] bg-[var(--red-tint)] px-3 py-2 text-[12.5px] text-[var(--red)]">
                      {b.text}
                    </div>
                  )}
                  {b.kind === "tool" && renderTool(b)}
                </div>
              ))}

              {busy && <LoadingState label="Churning" />}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3"
        >
          <div className="mx-auto flex w-full max-w-[520px] items-center gap-2 rounded-full bg-[var(--surface)] py-2 pr-2 pl-4 shadow-[var(--shadow-card)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for a route and a date…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--page)] transition-opacity disabled:opacity-20"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
