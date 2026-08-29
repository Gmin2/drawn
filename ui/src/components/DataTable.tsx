import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { spring } from "../lib/motion";

/* Adapted from the reference filter table: status chips filter the rows in
   place, and a hidden row collapses its own grid track rather than unmounting,
   so the table settles instead of jumping. */

export type TableRow = {
  id: string;
  cells: string[];
  status?: string;
};

export type DataTableProps = {
  title: string;
  columns: string[];
  rows: TableRow[];
};

const SAMPLE: DataTableProps = {
  title: "Open issues",
  columns: ["Issue", "Labels", "Updated", "Assignee"],
  rows: [
    { id: "490", cells: ["#490 Bright Data API key needs Bearer", "bug", "2d ago", "unassigned"], status: "open" },
    { id: "482", cells: ["#482 Sandbox bootstrap fails on proxy", "—", "3d ago", "unassigned"], status: "open" },
    { id: "461", cells: ["#461 Daytona misreports permission error", "help wanted", "4d ago", "unassigned"], status: "closed" },
  ],
};

// Status colours are assigned by position rather than by name, so the component
// stays domain-agnostic: it has no idea what "open" or "in progress" mean.
const DOTS = [
  "var(--accent)",
  "var(--orange)",
  "var(--green)",
  "var(--red)",
  "var(--ink-3)",
];

export function DataTable({
  title = SAMPLE.title,
  columns = SAMPLE.columns,
  rows = SAMPLE.rows,
}: Partial<DataTableProps>) {
  const [filter, setFilter] = useState<string>("all");

  const statuses = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of rows) {
      if (!row.status) continue;
      seen.set(row.status, (seen.get(row.status) ?? 0) + 1);
    }
    return [...seen.entries()];
  }, [rows]);

  const template = `minmax(0,1.5fr) ${columns
    .slice(1)
    .map(() => "minmax(0,0.85fr)")
    .join(" ")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={spring.glide}
      className="w-full"
    >
      <div className="mb-1.5 flex items-center gap-1 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
        <span className="mr-1 shrink-0 text-[12px] text-[var(--ink-3)]">{title}</span>
        {statuses.length > 0 && (
          <>
            <Chip
              label="All"
              count={rows.length}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {statuses.map(([status, count], i) => (
              <Chip
                key={status}
                label={status}
                count={count}
                dot={DOTS[i % DOTS.length]}
                active={filter === status}
                onClick={() => setFilter(status)}
              />
            ))}
          </>
        )}
      </div>

      <div
        role="region"
        aria-label={title}
        tabIndex={0}
        className="overflow-x-auto rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="min-w-[440px]">
          <div
            className="grid border-b border-[var(--line)] text-[12px] font-medium text-[var(--ink-2)]"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((column, i) => (
              <span
                key={column}
                className={`px-3 py-2 ${i < columns.length - 1 ? "border-r border-[var(--line)]" : ""}`}
              >
                {column}
              </span>
            ))}
          </div>

          {rows.map((row) => {
            const shown = filter === "all" || row.status === filter;
            return (
              <div
                key={row.id}
                className="grid transition-[grid-template-rows,opacity] duration-300"
                style={{
                  gridTemplateRows: shown ? "1fr" : "0fr",
                  opacity: shown ? 1 : 0,
                  transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              >
                <div className="overflow-hidden">
                  <div
                    className="grid border-b border-[var(--line)] text-[12.5px] transition-colors duration-100 hover:bg-[var(--hover)]"
                    style={{ gridTemplateColumns: template }}
                  >
                    {row.cells.map((cell, i) => (
                      <span
                        key={i}
                        className={`flex min-w-0 items-center px-3 py-2 ${
                          i < columns.length - 1 ? "border-r border-[var(--line)]" : ""
                        } ${i === 0 ? "font-medium text-[var(--ink)]" : "text-[var(--ink-2)]"}`}
                      >
                        <span className="truncate">{cell}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function Chip({
  label,
  count,
  dot,
  active,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-[background-color,box-shadow,color] duration-200 ${
        active
          ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-btn)]"
          : "text-[var(--ink-2)] hover:bg-[var(--hover)]"
      }`}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: dot }} />}
      {label}
      <span
        className={`rounded-[4px] px-1 text-[10.5px] tabular-nums ${
          active ? "bg-[var(--field)] text-[var(--ink-2)]" : "text-[var(--ink-3)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
