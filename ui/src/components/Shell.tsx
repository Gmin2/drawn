import { useEffect, useState, type ReactNode } from "react";

/* Sidebar layout from the reference: hatched gutters either side of a fixed
   container, a rail carrying the mark, the claim, a hairline and the connector
   list, with the attribution pinned to the bottom. */

const CONNECTORS = [
  { name: "flights", note: "Kiwi · public, no auth" },
  { name: "render-kit", note: "our components" },
];

function ThemeToggle({ dark, onChange }: { dark: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--surface)] p-1 shadow-[var(--shadow-btn)]">
      {[false, true].map((isDark) => (
        <button
          key={String(isDark)}
          type="button"
          aria-label={isDark ? "Dark mode" : "Light mode"}
          aria-pressed={dark === isDark}
          onClick={() => onChange(isDark)}
          className={`grid size-6 place-items-center rounded-full transition-colors duration-150 ${
            dark === isDark ? "text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
          }`}
        >
          {isDark ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  turns,
}: {
  children: ReactNode;
  onReset: () => void;
  turns: number;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="hatch flex min-h-dvh w-full justify-center">
      <div className="flex w-full max-w-[1120px] bg-[var(--page)]">
        <aside className="hidden w-[292px] shrink-0 flex-col border-r border-[var(--line)] px-8 py-9 md:flex">
          <div className="flex items-start justify-between gap-3">
            <svg width="40" height="40" viewBox="0 0 28 28" fill="none" aria-label="GenUI Kit">
              <rect x="2" y="5" width="9" height="18" rx="2.5" fill="var(--ink)" />
              <rect x="13.5" y="5" width="12.5" height="8" rx="2.5" fill="var(--ink)" />
              <rect x="13.5" y="15" width="12.5" height="8" rx="2.5" fill="var(--accent)" />
            </svg>
            <ThemeToggle dark={dark} onChange={setDark} />
          </div>

          <h2 className="mt-7 text-[22px] leading-[1.2] font-semibold tracking-[-0.4px] text-balance text-[var(--ink)]">
            Generative UI for any MCP server.
          </h2>

          <div className="my-7 border-t border-dashed border-[var(--line-strong)]" />

          <div className="text-[11px] tracking-wide text-[var(--ink-3)]">Connectors</div>
          <ul className="mt-3 flex flex-col">
            {CONNECTORS.map((c) => (
              <li key={c.name} className="py-1.5">
                <div className="font-mono text-[13px] text-[var(--ink)]">{c.name}</div>
                <div className="text-[12px] text-[var(--ink-3)]">{c.note}</div>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col items-start gap-2 pt-8">
            <div className="text-[12.5px] text-[var(--ink-3)]">
              {turns} {turns === 1 ? "turn" : "turns"} this session
            </div>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full bg-[var(--surface)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--ink)] shadow-[var(--shadow-btn)] transition-colors hover:bg-[var(--hover)]"
            >
              New session →
            </button>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-3)]">
              Running on TrueForge, the open-source agent harness.
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
