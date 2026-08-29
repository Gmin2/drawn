import { useState } from "react";
import { motion } from "motion/react";
import { spring, ease } from "../lib/motion";
import type { Field } from "./DetailCard";

export type ConfirmCardProps = {
  title: string;
  summary: string;
  consequence: string;
  confirmLabel: string;
  fields: Field[];
  onDecide?: (approved: boolean) => void;
  settled?: "allow" | "deny";
};

const SAMPLE: ConfirmCardProps = {
  title: "Confirm Flight Booking",
  summary: "You are about to open the external booking page to complete your flight booking.",
  consequence: "Completing the booking will process your payment and finalise the reservation.",
  confirmLabel: "Open Booking Link",
  fields: [
    { label: "Flight", value: "Alaska Airlines AS211" },
    { label: "Price", value: "165 EUR" },
  ],
};

// The morph between asking and settled runs on a symmetric ease rather than a
// spring. Springs overshoot, and overshoot reads as playful, which is wrong for
// something the user cannot take back.
const DECIDE = { duration: 0.4, ease: ease.inOut };

export function ConfirmCard({
  title = SAMPLE.title,
  summary = SAMPLE.summary,
  consequence = SAMPLE.consequence,
  confirmLabel = SAMPLE.confirmLabel,
  fields = SAMPLE.fields,
  onDecide,
  settled,
}: Partial<ConfirmCardProps>) {
  const [busy, setBusy] = useState(false);

  function decide(approved: boolean) {
    // Lock for the length of the morph so a double tap cannot fire twice.
    if (busy || settled) return;
    setBusy(true);
    onDecide?.(approved);
    setTimeout(() => setBusy(false), 400);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={spring.gentle}
      className="flex flex-col gap-3 rounded-lg border border-amber-900/40 bg-zinc-900 p-4"
    >
      <div className="text text-base font-medium text-zinc-100">{title}</div>
      <div className="text text-sm text-zinc-300">{summary}</div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md bg-zinc-950/60 p-3">
          {fields.map((field) => (
            <div key={field.label} className="flex flex-row justify-between gap-4">
              <div className="text text-xs text-zinc-500">{field.label}</div>
              <div className="text truncate text-xs text-zinc-300">{field.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text text-xs leading-relaxed text-amber-500/90">{consequence}</div>

      {settled ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={DECIDE}
          className={`text rounded-md px-3 py-2 text-sm ${
            settled === "allow"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {settled === "allow" ? "Approved" : "Declined"}
        </motion.div>
      ) : (
        <div className="flex flex-row gap-2">
          <motion.button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            whileTap={{ scale: 0.97 }}
            transition={DECIDE}
            className="flex-1 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
          >
            {confirmLabel}
          </motion.button>
          <motion.button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            whileTap={{ scale: 0.97 }}
            transition={DECIDE}
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-300 disabled:opacity-40"
          >
            Cancel
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
