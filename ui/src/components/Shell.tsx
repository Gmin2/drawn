import { useEffect, useState } from "react";

type Connector = { name: string; tools: number; note: string };

const CONNECTORS: Connector[] = [
  { name: "flights", tools: 4, note: "Kiwi, public, no auth" },
  { name: "render-kit", tools: 4, note: "our components" },
];

export function Shell({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset: () => void;
}) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="hatch flex h-dvh w-full justify-center overflow-hidden">
      <div className="flex w-full max-w-[1180px] bg-[var(--page)]">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-[var(--line)] px-6 py-8 md:flex">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold tracking-tight">GenUI Kit</div>
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle theme"
              className="rounded-[var(--radius-chip)] px-2 py-1 text-[11px] text-[var(--ink-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink-2)]"
            >
              {dark ? "dark" : "light"}
            </button>
          </div>

          <p className="mt-2 text-[12.5px] leading-snug text-pretty text-[var(--ink-3)]">
            Any MCP server, rendered as real interface instead of JSON.
          </p>

          <div className="my-6 border-t border-dashed border-[var(--line)]" />

          <div className="text-[11px] tracking-wide text-[var(--ink-3)]">Connectors</div>
          <ul className="mt-2 flex flex-col gap-0.5">
            {CONNECTORS.map((c) => (
              <li
                key={c.name}
                className="flex items-baseline justify-between rounded-[var(--radius-chip)] px-2 py-1.5 transition-colors hover:bg-[var(--hover)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-[12px] text-[var(--ink)]">
                    {c.name}
                  </div>
                  <div className="truncate text-[11px] text-[var(--ink-3)]">{c.note}</div>
                </div>
                <span className="ml-2 shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-3)]">
                  {c.tools}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <button
              type="button"
              onClick={onReset}
              className="w-fit rounded-[var(--radius-control)] px-2.5 py-1.5 text-[12px] text-[var(--ink-2)] shadow-[var(--shadow-btn)] transition-colors hover:bg-[var(--hover)]"
            >
              New session
            </button>
            <div className="text-[11px] leading-snug text-[var(--ink-3)]">
              Running on TrueForge
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col border-r border-[var(--line)]">
          {children}
        </main>
      </div>
    </div>
  );
}
