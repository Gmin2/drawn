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

const AGENT = "genui-flights";

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

  return (
    <Shell onReset={reset} turns={turns}>
      <p className="mb-6 text-[12px] leading-5 font-[425] tracking-[-0.06px] text-[var(--ink-faint)]">
        Generative UI on TrueForge
      </p>

      <h1 className="mb-6 font-[var(--font-display)] text-[28px] leading-[1.15] font-semibold tracking-[-0.6px] text-[var(--ink)]">
        Any MCP server, rendered as real interface.
      </h1>

      <p className="mb-10 text-[13px] leading-[22px] text-[var(--ink-2)]">
        Ask for a route and a date. The agent calls a public flight connector, then draws
        the results with its own components instead of describing them in prose. Picking
        one continues the conversation; anything irreversible stops for you first.
      </p>

      <div className="flex flex-col gap-4">
        {bubbles.map((b, i) => (
          <div key={i}>
            {b.kind === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-[var(--radius-control)] bg-[var(--field)] px-3 py-1.5 text-[13px] leading-5 text-[var(--ink)]">
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

        {busy && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--ink-faint)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            working
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-6 z-20 mt-8"
      >
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-card)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a route and a date…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-chip)] bg-[var(--ink)] text-[var(--bg)] transition-opacity disabled:opacity-25"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </form>
    </Shell>
  );
}
