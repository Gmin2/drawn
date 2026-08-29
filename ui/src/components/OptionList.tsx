import { motion } from "motion/react";
import { spring } from "../lib/motion";

export type Option = {
  id: string;
  primary: string;
  secondary?: string;
  tertiary?: string;
  value?: string;
  valueLabel?: string;
  meta?: string;
  badges?: string[];
};

export type OptionListProps = {
  title: string;
  options: Option[];
  onPick?: (option: Option) => void;
  disabled?: boolean;
};

// Sample data so the component can render with no props at all. The loading
// branch mounts it bare and the .skeleton wrapper masks the text, which keeps
// the shape identical before and after the real payload arrives.
const SAMPLE: OptionListProps = {
  title: "Flights from SFO to JFK",
  options: [
    {
      id: "s1",
      primary: "06:18 - 15:01",
      secondary: "Alaska Airlines",
      tertiary: "SFO - JFK",
      value: "165 EUR",
      valueLabel: "One way",
      meta: "Nonstop · 5h 43m",
    },
    {
      id: "s2",
      primary: "05:30 - 17:55",
      secondary: "American Airlines",
      tertiary: "SFO - JFK",
      value: "181 EUR",
      valueLabel: "One way",
      meta: "1 stop · 9h 25m",
    },
    {
      id: "s3",
      primary: "06:36 - 20:35",
      secondary: "American Airlines",
      tertiary: "SFO - JFK",
      value: "181 EUR",
      valueLabel: "One way",
      meta: "1 stop · 10h 59m",
    },
  ],
};

export function OptionList({
  title = SAMPLE.title,
  options = SAMPLE.options,
  onPick,
  disabled,
}: Partial<OptionListProps>) {
  return (
    <div className="flex flex-col rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--line)] px-4 py-2.5 text-[12.5px] font-medium text-[var(--ink-3)]">
        {title}
      </div>

      <div className="flex flex-col px-4">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(option)}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...spring.glide, delay: 0.06 + index * 0.03 }}
            whileTap={disabled ? undefined : { scale: 0.99 }}
            className="group flex w-full flex-row items-center gap-4 border-b border-[var(--line)] py-3 text-left last:border-none disabled:cursor-not-allowed"
          >
            <div className="flex w-full flex-col gap-0.5">
              <div className="text-[13px] font-medium text-[var(--ink)] group-hover:underline">
                {option.primary}
              </div>
              {option.secondary && (
                <div className="text-[12.5px] text-[var(--ink-3)]">{option.secondary}</div>
              )}
              <div className="flex flex-row items-center gap-2">
                {option.tertiary && (
                  <div className="text-[11px] text-[var(--ink-3)]">{option.tertiary}</div>
                )}
                {option.meta && (
                  <div className="text-[11px] text-[var(--ink-3)]">{option.meta}</div>
                )}
              </div>
            </div>

            <div className="flex w-32 shrink-0 flex-col items-end gap-0.5">
              {option.value && (
                <div className="text-[13px] text-[var(--green)]">{option.value}</div>
              )}
              {option.valueLabel && (
                <div className="text-[11px] text-[var(--ink-3)]">{option.valueLabel}</div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
