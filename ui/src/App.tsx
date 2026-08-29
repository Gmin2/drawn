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

    return (
      <div className="rounded-lg bg-zinc-900 p-3">
        <div className="mb-2 text-xs text-zinc-500">{b.name}</div>
        <pre className="overflow-x-auto text-xs text-zinc-300">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex h-dvh justify-center bg-zinc-950 text-zinc-100">
      <div className="flex w-full max-w-[500px] flex-col gap-4 px-4 py-8">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {bubbles.map((b, i) => (
            <div key={i}>
              {b.kind === "user" && <div className="text-zinc-400">{b.text}</div>}
              {b.kind === "text" && (
                <div className="whitespace-pre-wrap text-zinc-200">{b.text}</div>
              )}
              {b.kind === "error" && (
                <div className="rounded-lg bg-red-950 p-3 text-sm text-red-300">{b.text}</div>
              )}
              {b.kind === "tool" && renderTool(b)}
            </div>
          ))}
          {busy && <div className="text-sm text-zinc-500">thinking…</div>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message…"
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-zinc-900 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
