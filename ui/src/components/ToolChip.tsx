import { motion } from "motion/react";
import { spring } from "../lib/motion";

// Any tool we have no component for collapses to one line instead of dumping
// JSON into the transcript. The arguments stay reachable behind a disclosure so
// nothing is actually hidden from the user.
export function ToolChip({ name, args }: { name: string; args: Record<string, unknown> }) {
  const summary = Object.entries(args)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .slice(0, 3)
    .map(([, v]) => String(v))
    .join(" · ");

  return (
    <motion.details
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.glide}
      className="group rounded-[var(--radius-chip)] bg-[var(--inset)] px-2.5 py-1.5"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] text-[var(--ink-3)] marker:hidden">
        <span className="font-mono text-[11px] text-[var(--ink-2)]">{name}</span>
        {summary && <span className="truncate">{summary}</span>}
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-[var(--radius-chip)] bg-[var(--canvas)] p-2 font-mono text-[11px] leading-relaxed text-[var(--ink-2)]">
        {JSON.stringify(args, null, 2)}
      </pre>
    </motion.details>
  );
}
