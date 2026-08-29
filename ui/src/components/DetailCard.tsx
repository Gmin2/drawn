import { motion } from "motion/react";
import { spring, ease } from "../lib/motion";

export type Field = { label: string; value: string };

export type DetailCardProps = {
  title: string;
  subtitle?: string;
  fields: Field[];
  body?: string;
  badges?: string[];
};

const SAMPLE: DetailCardProps = {
  title: "Alaska Airlines Flight AS211",
  subtitle: "SFO to JFK · Sep 20, 2026",
  badges: ["Nonstop", "165 EUR", "Economy"],
  fields: [
    { label: "Route", value: "SFO → JFK" },
    { label: "Departure", value: "2026-09-20 06:18" },
    { label: "Arrival", value: "2026-09-20 15:01" },
    { label: "Duration", value: "5h 43m" },
  ],
};

export function DetailCard({
  title = SAMPLE.title,
  subtitle = SAMPLE.subtitle,
  fields = SAMPLE.fields,
  body,
  badges,
}: Partial<DetailCardProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={spring.soft}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-card)] p-4"
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-[15px] font-medium text-[var(--ink)]">{title}</div>
        {subtitle && <div className="text-[12.5px] text-[var(--ink-3)]">{subtitle}</div>}
      </div>

      {badges && badges.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1.5">
          {badges.map((badge, i) => (
            <motion.span
              key={badge}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.glide, delay: 0.1 + i * 0.04 }}
              className="rounded-[var(--radius-chip)] bg-[var(--inset)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]"
            >
              {badge}
            </motion.span>
          ))}
        </div>
      )}

      <div className="h-px bg-[var(--line)]" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {fields.map((field, i) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32, delay: 0.12 + i * 0.04, ease: ease.out }}
            className="flex flex-col gap-0.5"
          >
            <div className="text-[11px] text-[var(--ink-3)]">{field.label}</div>
            <div className="text-[12.5px] text-[var(--ink-2)]">{field.value}</div>
          </motion.div>
        ))}
      </div>

      {body && <div className="text-[12.5px] leading-relaxed text-[var(--ink-3)]">{body}</div>}
    </motion.div>
  );
}
