import { useState, type ReactNode } from "react";

/* Line-numbered listing with light JSON colouring, following the reference code
   block: strings and numbers warm, keys and literals in the accent, punctuation
   receding. Deliberately a regex rather than a highlighter dependency — this
   only ever renders tool arguments, which are always JSON. */

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g;

function highlight(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let k = 0;

  for (const m of line.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) {
      nodes.push(
        <span key={k++} style={{ color: "var(--ink-3)" }}>
          {line.slice(last, idx)}
        </span>,
      );
    }

    const [whole, str, colon, num, lit] = m;
    if (str && colon) {
      // a key: the string plus its colon
      nodes.push(
        <span key={k++} style={{ color: "var(--accent-ink)", fontWeight: 500 }}>
          {str}
        </span>,
        <span key={k++} style={{ color: "var(--ink-3)" }}>
          {colon}
        </span>,
      );
    } else if (str) {
      nodes.push(
        <span key={k++} style={{ color: "var(--orange)" }}>
          {str}
        </span>,
      );
    } else if (num) {
      nodes.push(
        <span key={k++} style={{ color: "var(--orange)" }}>
          {num}
        </span>,
      );
    } else {
      nodes.push(
        <span key={k++} style={{ color: "var(--accent-ink)" }}>
          {lit}
        </span>,
      );
    }
    last = idx + whole.length;
  }

  if (last < line.length) {
    nodes.push(
      <span key={k++} style={{ color: "var(--ink-3)" }}>
        {line.slice(last)}
      </span>,
    );
  }
  return nodes;
}

export function CodeBlock({ name, code }: { name: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard is unavailable in some embeddings; the text is still selectable
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface)] shadow-[var(--shadow-hairline)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-[var(--ink-2)]">
          <span className="text-[var(--ink-3)]">{"</>"}</span>
          {name}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[11.5px] text-[var(--ink-3)] transition-colors duration-150 hover:text-[var(--ink)]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="max-h-[320px] overflow-auto py-2">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3 px-3">
            <span className="w-6 shrink-0 text-right font-mono text-[11px] leading-[1.65] tabular-nums text-[var(--ink-3)] select-none">
              {i + 1}
            </span>
            <pre className="font-mono text-[12px] leading-[1.65] whitespace-pre">
              {highlight(line)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
