export type ToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

export type TurnEvent = {
  type: string;
  id: string;
  created_at: string;
  thread_id: string | null;
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  finish_reason?: string;
  state?: { status: string; message?: string };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? `${init?.method ?? "GET"} ${path} failed (${res.status})`);
  }
  return body.data as T;
}

export function createSession(agentName: string) {
  return call<{ id: string }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ agent: { name: agentName } }),
  });
}

export function createTurn(sessionId: string, content: string) {
  return call<{ id: string }>(`/sessions/${sessionId}/turns`, {
    method: "POST",
    body: JSON.stringify({
      input: [{ type: "user.message", content }],
      stream: false,
    }),
  });
}

export type RequiredAction = {
  type: string;
  thread_id: string;
  tool_calls: { id: string; source_event_id: string }[];
};

export type TurnState = {
  status: string;
  message?: string;
  required_actions?: RequiredAction[];
};

export function getTurn(sessionId: string, turnId: string) {
  return call<{ state: TurnState }>(`/sessions/${sessionId}/turns/${turnId}`);
}

// Resuming a held tool call is just another turn whose only input is the verdict.
export function respondToApproval(
  sessionId: string,
  threadId: string,
  toolCallId: string,
  status: "allow" | "deny",
) {
  return call<{ id: string }>(`/sessions/${sessionId}/turns`, {
    method: "POST",
    body: JSON.stringify({
      input: [
        {
          type: "user.tool_approval",
          thread_id: threadId,
          tool_call_id: toolCallId,
          approval: { status },
        },
      ],
      stream: false,
    }),
  });
}

export function listTurnEvents(sessionId: string, turnId: string) {
  return call<TurnEvent[]>(`/sessions/${sessionId}/turns/${turnId}/events`);
}

// The harness reports `running` until the turn settles. Poll rather than stream
// for now; streaming lands once the render path is proven.
async function settle(sessionId: string, turnId: string) {
  for (let i = 0; i < 200; i++) {
    const { state } = await getTurn(sessionId, turnId);
    if (state.status !== "running") {
      const events = await listTurnEvents(sessionId, turnId);
      return {
        status: state.status,
        message: state.message,
        requiredActions: state.required_actions ?? [],
        events,
      };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("turn did not settle in time");
}

export async function runTurn(sessionId: string, content: string) {
  const turn = await createTurn(sessionId, content);
  return settle(sessionId, turn.id);
}

export async function runApproval(
  sessionId: string,
  threadId: string,
  toolCallId: string,
  status: "allow" | "deny",
) {
  const turn = await respondToApproval(sessionId, threadId, toolCallId, status);
  return settle(sessionId, turn.id);
}
