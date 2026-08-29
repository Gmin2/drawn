import type { ReactNode } from "react";

/* Blueprint chrome from the wireframe.co layout: 40px dashed strips pinned to
   each edge, four fixed column rules at 50% ± 228px and 50% ± 512px, a nav rail
   outside the content column, and a gradient mask over the bottom. The rules are
   fixed rather than in flow so they never repaint as the transcript grows. */

const CONNECTORS = [
  { name: "flights", tools: 4, note: "Kiwi · public" },
  { name: "render-kit", tools: 4, note: "our components" },
];

export function Shell({
  children,
  onReset,
  turns,
}: {
  children: ReactNode;
  onReset: () => void;
  turns: number;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[var(--bg)]">
      <div className="pointer-events-none fixed -top-12 -bottom-12 left-0 z-0 w-10 border-r border-dashed border-[var(--strip-edge)] bg-[var(--strip-fill)] opacity-50" />
      <div className="pointer-events-none fixed -top-12 -bottom-12 right-0 z-0 w-10 -scale-x-100 border-r border-dashed border-[var(--strip-edge)] bg-[var(--strip-fill)] opacity-50" />

      {[-512, -228, 228, 512].map((x) => (
        <div
          key={x}
          className="pointer-events-none fixed top-0 bottom-0 z-0 w-0 border-r border-dashed border-[var(--grid-line)]"
          style={{ left: `calc(50% + ${x}px)` }}
        />
      ))}

      <nav className="fixed top-[120px] z-10 hidden flex-col items-start lg:flex" style={{ left: "max(24px, 50% - 512px)" }}>
        <a href="/" className="mb-6 block">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="GenUI Kit">
            <rect x="2" y="6" width="9" height="16" rx="2" fill="var(--ink)" />
            <rect x="13.5" y="6" width="12.5" height="7" rx="2" fill="var(--ink)" />
            <rect x="13.5" y="15" width="12.5" height="7" rx="2" fill="var(--accent)" />
          </svg>
        </a>

        <div className="group flex flex-col items-start gap-2">
          <span className="text-[13px] leading-5 font-[450] tracking-[-0.065px] text-[var(--ink)]">
            Flight search
          </span>
          {CONNECTORS.map((c) => (
            <span
              key={c.name}
              className="font-mono text-[12px] leading-5 tracking-[-0.06px] text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]"
            >
              {c.name}
              <span className="ml-1.5 text-[var(--ink-faint)]">{c.tools}</span>
            </span>
          ))}
        </div>
      </nav>

      <div className="fixed bottom-10 z-[60] hidden flex-col gap-2 lg:flex" style={{ left: "max(24px, 50% - 512px)" }}>
        <p className="text-[11px] leading-[18px] tracking-[-0.055px] text-[var(--ink-2)]">
          Running on TrueForge
        </p>
        <button
          type="button"
          onClick={onReset}
          className="w-fit text-left text-[13px] leading-5 font-[450] tracking-[-0.065px] text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]"
        >
          New session
        </button>
      </div>

      <main className="relative mx-auto flex min-h-dvh max-w-[1024px] justify-center">
        <div className="absolute top-[120px] right-0 hidden items-center gap-2 text-[12px] leading-5 font-[425] tracking-[-0.06px] text-[var(--ink-faint)] lg:flex">
          <span className="whitespace-nowrap">{turns} {turns === 1 ? "turn" : "turns"}</span>
        </div>

        <div className="absolute top-[152px] right-0 hidden flex-col items-end lg:flex">
          <div className="my-6 h-px w-6 bg-black/10" />
          <a
            href="https://github.com/truefoundry/trueforge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] leading-5 font-[450] tracking-[-0.065px] text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            TrueForge
          </a>
        </div>

        <div className="relative box-border w-full max-w-[456px] px-4 pt-[120px] pb-16 lg:px-0">
          {children}
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[120px] bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  );
}
