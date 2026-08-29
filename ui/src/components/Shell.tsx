import { useEffect, useState } from "react";

type Connector = { name: string; tools: number; note: string };

const CONNECTORS: Connector[] = [
  { name: "flights", tools: 4, note: "Kiwi, public, no auth" },
  { name: "render-kit", tools: 4, note: "our components" },
];

function ThemeToggle({
  dark,
  onChange,
}: {
  dark: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--inset)] p-0.5">
      {[false, true].map((isDark) => (
        <button
          key={String(isDark)}
          type="button"
          aria-label={isDark ? "Dark mode" : "Light mode"}
          aria-pressed={dark === isDark}
          onClick={() => onChange(isDark)}
          className={`grid size-[18px] place-items-center rounded-full transition-colors duration-150 ${
            dark === isDark
              ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-btn)]"
              : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
          }`}
        >
          {isDark ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

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
      <div className="flex w-full max-w-[940px] bg-[var(--page)]">
        <aside className="hidden w-[196px] shrink-0 flex-col border-r border-[var(--line)] px-5 py-7 md:flex">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12.5px] font-semibold tracking-tight">GenUI Kit</div>
            <ThemeToggle dark={dark} onChange={setDark} />
          </div>

          <p className="mt-1.5 text-[12px] leading-snug text-pretty text-[var(--ink-3)]">
            Any MCP server, rendered as real interface instead of JSON.
          </p>

          <div className="my-5 border-t border-dashed border-[var(--line)]" />

          <div className="text-[11px] tracking-wide text-[var(--ink-3)]">Connectors</div>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {CONNECTORS.map((c) => (
              <li
                key={c.name}
                className="flex items-baseline justify-between rounded-[var(--radius-chip)] px-2 py-1 transition-colors hover:bg-[var(--hover)]"
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
