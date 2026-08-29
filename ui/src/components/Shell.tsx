import { useEffect, useState, type ReactNode } from "react";
import { SidebarNav, type Recent } from "./SidebarNav";

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
  recents,
  connectors,
  activeTitle,
  onPick,
}: {
  children: ReactNode;
  onReset: () => void;
  turns: number;
  recents: Recent[];
  connectors: { name: string; note: string }[];
  activeTitle: string | null;
  onPick: (r: Recent) => void;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="hatch flex h-dvh w-full justify-center overflow-hidden">
      <div className="flex w-full max-w-[1120px] bg-[var(--page)]">
        <div className="hidden md:flex">
          <SidebarNav
            recents={recents}
            connectors={connectors}
            activeTitle={activeTitle}
            turns={turns}
            onNewChat={onReset}
            onPick={onPick}
          />
        </div>

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="absolute top-5 right-6 z-30">
            <ThemeToggle dark={dark} onChange={setDark} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
