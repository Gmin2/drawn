import type { RequiredAction, TurnEvent } from "./trueforge";

/* Reads a turn as it happens instead of polling for it to finish.
 *
 * The harness sends an empty `model.message` shell followed by
 * `model.message.delta` fragments that share its id. A delta carries either
 * prose in `content`, or `tool_calls` where the first fragment for a call has
 * its id and name and every later fragment appends to `arguments`, keyed by
 * `index` rather than by id. So the merge is: accumulate text by message id,
 * accumulate tool arguments by (message id, index).
 */

export type StreamUpdate =
  | { kind: "text"; key: string; text: string }
  | { kind: "tool"; key: string; callId: string; name: string; argsText: string; done: boolean }
  | { kind: "settled"; status: string; message?: string; requiredActions: RequiredAction[] };

type PartialCall = { id: string; name: string; args: string; done: boolean };

export async function streamTurn(
  sessionId: string,
  input: unknown[],
  onUpdate: (u: StreamUpdate) => void,
  signal?: AbortSignal,
): Promise<{ status: string; message?: string; requiredActions: RequiredAction[] }> {
  const res = await fetch(`/api/v1/sessions/${sessionId}/turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ input, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `turn failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // message id -> accumulated prose, and (message id, call index) -> call
  const text = new Map<string, string>();
  const calls = new Map<string, PartialCall>();
  let settled = { status: "done", message: undefined as string | undefined, requiredActions: [] as RequiredAction[] };

  const handle = (event: TurnEvent & { tool_calls?: RawDeltaCall[] }) => {
    const id = event.id;

    if (event.type === "turn.done") {
      const state = event.state as
        | { status: string; message?: string; required_actions?: RequiredAction[] }
        | undefined;
      settled = {
        status: state?.status ?? "done",
        message: state?.message,
        requiredActions: state?.required_actions ?? [],
      };
      onUpdate({ kind: "settled", ...settled });
      return;
    }

    if (event.type !== "model.message" && event.type !== "model.message.delta") return;

    if (typeof event.content === "string" && event.content) {
      const next = (text.get(id) ?? "") + event.content;
      text.set(id, next);
      onUpdate({ kind: "text", key: id, text: next });
    }

    for (const raw of event.tool_calls ?? []) {
      // `index` is the only field present on every fragment; the id and name
      // arrive once, on the first one.
      const key = `${id}:${raw.index ?? 0}`;
      const existing = calls.get(key);
      const call: PartialCall = {
        id: raw.id ?? existing?.id ?? key,
        name: raw.function?.name ?? existing?.name ?? "",
        args: (existing?.args ?? "") + (raw.function?.arguments ?? ""),
        done: false,
      };
      calls.set(key, call);
      onUpdate({ kind: "tool", key, callId: call.id, name: call.name, argsText: call.args, done: false });
    }

    // finish_reason closes every call still open on this message
    if (event.finish_reason) {
      for (const [key, call] of calls) {
        if (!key.startsWith(`${id}:`) || call.done) continue;
        call.done = true;
        onUpdate({ kind: "tool", key, callId: call.id, name: call.name, argsText: call.args, done: true });
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // frames are separated by a blank line; anything after the last one is a
    // partial frame and has to wait for the next chunk
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          handle(JSON.parse(payload));
        } catch {
          // a frame we cannot parse is not worth killing the stream over
        }
      }
    }
  }

  return settled;
}

type RawDeltaCall = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
};
