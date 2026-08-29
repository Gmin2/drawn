import { useState } from "react";
import { createSession, runTurn, type TurnEvent } from "./lib/trueforge";
import { OptionList, type Option } from "./components/OptionList";

const AGENT = "genui-flights";

type Bubble =
  | { kind: "user"; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; args: unknown }
  | { kind: "error"; text: string };

// Every tool call the agent makes becomes a bubble. Rendering is keyed off the
// tool name, so a tool we have no component for still shows its payload rather
// than vanishing.
function eventsToBubbles(events: TurnEvent[]): Bubble[] {
  const out: Bubble[] = [];
  for (const e of events) {
    if (e.type !== "model.message") continue;
    if (e.content) out.push({ kind: "text", text: e.content });
    for (const tc of e.tool_calls ?? []) {
      let args: unknown = tc.function.arguments;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        // leave the raw string; the fallback renderer prints it either way
      }
      out.push({ kind: "tool", name: tc.function.name, args });
    }
  }
  return out;
}

// The whole generative-UI mechanism is this switch. The agent names a component
// and hands it props; nothing here knows what a flight is. An unmapped tool name
// falls through to its raw payload rather than disappearing.
function renderTool(
  b: { name: string; args: unknown },
  send: (text: string) => void,
  busy: boolean,
) {
  const args = b.args as Record<string, unknown>;

  if (b.name === "render_options") {
    return (
      <OptionList
        title={args.title as string}
        options={args.options as Option[]}
        disabled={busy}
        onPick={(option) =>
          send(
            `I'll take the ${option.primary} flight${
              option.secondary ? ` on ${option.secondary}` : ""
            }${option.value ? ` for ${option.value}` : ""}.`,
          )
        }
      />
    );
  }

  return (
    <div className="rounded-lg bg-zinc-900 p-3">
      <div className="mb-2 text-xs text-zinc-500">{b.name}</div>
      <pre className="overflow-x-auto text-xs text-zinc-300">
        {JSON.stringify(b.args, null, 2)}
      </pre>
    </div>
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("Find me flights from SFO to JFK on 2026-09-20");
  const [busy, setBusy] = useState(false);

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
      const turn = await runTurn(sid, text);
      if (turn.status === "error") {
        setBubbles((b) => [...b, { kind: "error", text: turn.message ?? "turn failed" }]);
      } else {
        setBubbles((b) => [...b, ...eventsToBubbles(turn.events)]);
      }
    } catch (err) {
      setBubbles((b) => [
        ...b,
        { kind: "error", text: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh justify-center bg-zinc-950 text-zinc-100">
      <div className="flex w-full max-w-[500px] flex-col gap-4 px-4 py-8">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {bubbles.map((b, i) => (
            <div key={i}>
              {b.kind === "user" && (
                <div className="text-zinc-400">{b.text}</div>
              )}
              {b.kind === "text" && <div>{b.text}</div>}
              {b.kind === "error" && (
                <div className="rounded-lg bg-red-950 p-3 text-sm text-red-300">{b.text}</div>
              )}
              {b.kind === "tool" && renderTool(b, send, busy)}
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
