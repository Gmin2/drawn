import { useState } from "react";
import {
  createSession,
  runApproval,
  runTurn,
  type RequiredAction,
  type TurnEvent,
} from "./lib/trueforge";
import { OptionList, type Option } from "./components/OptionList";
import { DetailCard, type Field } from "./components/DetailCard";
import { ConfirmCard } from "./components/ConfirmCard";
import { ToolChip } from "./components/ToolChip";
import { Shell } from "./components/Shell";
import { LoadingState } from "./components/LoadingState";
import type { Recent } from "./components/SidebarNav";

const AGENT = "genui-flights";

const CONNECTORS = [
  { name: "flights", note: "public" },
  { name: "render-kit", note: "local" },
];

const PROMPTS: Recent[] = [
  { id: "sfo-jfk", label: "SFO to JFK in September", prompt: "Find me flights from SFO to JFK on 2026-09-20" },
  { id: "lhr-cdg", label: "London to Paris next month", prompt: "Find flights from LHR to CDG on 2026-10-05" },
  { id: "cheapest", label: "Cheapest dates to Lisbon", prompt: "What are the cheapest dates to fly from LHR to LIS in October 2026?" },
  { id: "nonstop", label: "Nonstop only, SFO to Tokyo", prompt: "Find nonstop flights from SFO to HND on 2026-11-12" },
  { id: "airports", label: "Airports near Milan", prompt: "Which airports serve Milan?" },
];

type Bubble =
  | { kind: "user"; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; id: string; name: string; args: Record<string, unknown> }
  | { kind: "error"; text: string };

function eventsToBubbles(events: TurnEvent[]): Bubble[] {
  const out: Bubble[] = [];
  for (const e of events) {
    if (e.type !== "model.message") continue;
    if (e.content) out.push({ kind: "text", text: e.content });
    for (const tc of e.tool_calls ?? []) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = { raw: tc.function.arguments };
      }
      out.push({ kind: "tool", id: tc.id, name: tc.function.name, args });
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

  function reset() {
    setSessionId(null);
    setBubbles([]);
    setPending([]);
    setDecided({});
  }

  const turns = bubbles.filter((b) => b.kind === "user").length;

  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  function pick(r: Recent) {
    setActiveTitle(r.label);
    send(r.prompt);
  }

  return (
    <Shell
      onReset={() => {
        reset();
        setActiveTitle(null);
      }}
      turns={turns}
      recents={PROMPTS}
      connectors={CONNECTORS}
      activeTitle={activeTitle}
      onPick={pick}
    >
      <div className="flex min-h-0 flex-1 flex-col px-8 py-9">
        <div className="mb-3 flex items-start gap-2 sm:items-baseline">
          <span className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-3)] sm:mt-0">
            01
          </span>
          <div className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
            <h3 className="text-[13px] font-semibold whitespace-nowrap text-[var(--ink)]">
              Flight search
            </h3>
            <p className="mt-0.5 text-[12.5px] text-pretty text-[var(--ink-3)] sm:mt-0">
              Live connector data, drawn by the agent as pickable interface.
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[var(--radius-window)] bg-[var(--canvas)] p-6">
          {bubbles.length === 0 ? (
            <div className="m-auto max-w-[340px] text-center text-[12.5px] leading-relaxed text-[var(--ink-3)]">
              Ask for a route and a date. The agent calls the flight connector, then draws
              the results with its own components instead of describing them.
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
          <div className="flex items-center gap-2 rounded-[var(--radius-window)] bg-[var(--surface)] px-3.5 py-2.5 shadow-[var(--shadow-card)]">
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
