import { useState } from "react";
import { motion } from "motion/react";
import { spring, ease } from "../lib/motion";
import { IconChevronDownSmall } from "./icons";

/* A tool with no component of its own collapses to one chip that hugs its
   content, rather than a full-width JSON block. The chevron is the affordance:
   nothing is hidden, it is just folded away until asked for. */
export function ToolChip({ name, args }: { name: string; args: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);

  const summary = Object.values(args)
    .filter((v) => typeof v === "string" || typeof v === "number")
    .slice(0, 3)
    .map(String)
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.glide}
      className="w-fit max-w-full"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-[var(--radius-chip)] bg-[var(--inset)] py-1.5 pr-2 pl-2.5 text-left transition-colors duration-150 hover:bg-[var(--hover-2)]"
      >
        <span className="font-mono text-[11.5px] text-[var(--ink-2)]">{name}</span>
        {summary && (
          <span className="truncate text-[12px] text-[var(--ink-3)]">{summary}</span>
        )}
        <span
          className="ml-auto shrink-0 text-[var(--ink-3)] transition-transform duration-200"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <IconChevronDownSmall size={14} />
        </span>
      </button>

      {open && (
        <motion.pre
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25, ease: ease.out }}
          className="mt-1 overflow-x-auto rounded-[var(--radius-chip)] bg-[var(--canvas)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--ink-2)]"
        >
          {JSON.stringify(args, null, 2)}
        </motion.pre>
      )}
    </motion.div>
  );
}
