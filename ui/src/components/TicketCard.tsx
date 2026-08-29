import { motion } from "motion/react";
import { spring, ease } from "../lib/motion";
import type { Field } from "./DetailCard";

export type Endpoint = {
  code: string;
  place?: string;
  time?: string;
  detail?: string;
};

export type TicketCardProps = {
  title: string;
  subtitle?: string;
  endpoints: { from: Endpoint; to: Endpoint };
  fields: Field[];
  badges?: string[];
  body?: string;
};

const SAMPLE: TicketCardProps = {
  title: "Air India Limited",
  subtitle: "31 Aug 2026 · One way",
  endpoints: {
    from: { code: "BLR", place: "Bengaluru", time: "16:35", detail: "Terminal 1" },
    to: { code: "GAU", place: "Guwahati", time: "19:45", detail: "Terminal 1" },
  },
  fields: [
    { label: "Flight", value: "AI9499" },
    { label: "Duration", value: "3h 10m" },
    { label: "Cabin", value: "Economy" },
    { label: "Price", value: "75 EUR" },
  ],
  badges: ["Nonstop"],
};

/* Models hand back whatever the upstream API gave them, which for flights is an
   ISO timestamp. Never trust the format: pull the clock time out if it looks
   like one, otherwise print what we were given. */
function clock(value?: string) {
  if (!value) return undefined;
  const iso = value.match(/T(\d{2}:\d{2})/);
  if (iso) return iso[1];
  return value;
}

/* A ticket rather than a card. The stub is separated by a perforation with a
   notch punched out of each side, which is the detail that makes it read as a
   physical object instead of a panel with a dashed line in it. */
export function TicketCard({
  title = SAMPLE.title,
  subtitle = SAMPLE.subtitle,
  endpoints = SAMPLE.endpoints,
  fields = SAMPLE.fields,
  badges,
  body,
}: Partial<TicketCardProps>) {
  const { from, to } = endpoints;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={spring.gentle}
      className="relative overflow-hidden rounded-[var(--radius-window)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
    >
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[13px] font-medium text-[var(--ink)]">{title}</div>
          {subtitle && (
            <div className="shrink-0 text-[11.5px] text-[var(--ink-3)]">{subtitle}</div>
          )}
        </div>

        {/* the plane is centred on the card, not between the two stacks, so it
            never drifts when one place name is longer than the other */}
        <div className="relative mt-4 flex flex-row items-start justify-between">
          <Side endpoint={from} />
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="text-[var(--ink-3)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 13.5 21 6l-4.5 9.5-3-2.5-4 4v-4l-7.5-.5Z" />
              </svg>
            </span>
          </div>
          <Side endpoint={to} align="right" />
        </div>

        {badges && badges.length > 0 && (
          <div className="mt-4 flex flex-row flex-wrap gap-1.5">
            {badges.map((badge, i) => (
              <motion.span
                key={badge}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.glide, delay: 0.14 + i * 0.04 }}
                className="rounded-[var(--radius-chip)] bg-[var(--inset)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]"
              >
                {badge}
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* perforation: a dashed rule with a notch punched through each edge */}
      <div className="relative h-0">
        <span className="absolute -left-[7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-[var(--canvas)]" />
        <span className="absolute -right-[7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-[var(--canvas)]" />
        <span className="absolute inset-x-3.5 top-1/2 border-t border-dashed border-[var(--line-strong)]" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 pt-5 pb-4 sm:grid-cols-4">
        {fields.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 + i * 0.04, ease: ease.out }}
            className="flex flex-col gap-0.5"
          >
            <div className="text-[10.5px] tracking-wide text-[var(--ink-3)] uppercase">
              {f.label}
            </div>
            <div className="text-[12.5px] leading-snug text-[var(--ink)]">{f.value}</div>
          </motion.div>
        ))}
      </div>

      {body && (
        <p className="px-5 pb-4 text-[11.5px] leading-relaxed text-[var(--ink-3)]">{body}</p>
      )}
    </motion.div>
  );
}

function Side({ endpoint, align = "left" }: { endpoint: Endpoint; align?: "left" | "right" }) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${right ? "items-end text-right" : ""}`}>
      {endpoint.place && (
        <div className="truncate text-[11.5px] text-[var(--ink-3)]">{endpoint.place}</div>
      )}
      <div className="text-[26px] leading-none font-semibold tracking-[-0.5px] text-[var(--ink)]">
        {endpoint.code}
      </div>
      {endpoint.time && (
        <div className="mt-1 text-[13px] font-medium text-[var(--ink)]">
          {clock(endpoint.time)}
        </div>
      )}
      {endpoint.detail && (
        <div className="truncate text-[11px] text-[var(--ink-3)]">{endpoint.detail}</div>
      )}
    </div>
  );
}
