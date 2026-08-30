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
  href?: string;
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

// One base hue per status, assigned by order of appearance rather than by name,
// so the component stays domain-agnostic: it has no idea what "open" or "bug"
// mean. Everything else about the pill is derived from this in CSS.
const HUES = [
  "oklch(75.7% 0.153 66.401)",
  "oklch(67.1% 0.118 219.351)",
  "oklch(65.2% 0.131 162.865)",
  "oklch(62% 0.18 293)",
  "oklch(64% 0.19 27)",
  "oklch(66% 0.21 323)",
];

export function DataTable({
  title = SAMPLE.title,
  columns = SAMPLE.columns,
  rows = SAMPLE.rows,
}: Partial<DataTableProps>) {
  // null rather than "all": status is an unrestricted string, so any sentinel
  // drawn from the same space could collide with a real status.
  const [filter, setFilter] = useState<string | null>(null);

  const statuses = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of rows) {
      if (!row.status) continue;
      seen.set(row.status, (seen.get(row.status) ?? 0) + 1);
    }
    return [...seen.entries()];
  }, [rows]);

  const hueFor = (status: string) => {
    const index = statuses.findIndex(([name]) => name === status);
    return HUES[(index < 0 ? 0 : index) % HUES.length];
  };

  // The status becomes its own column of pills, appended after whatever the
  // agent supplied, rather than being flattened into a plain cell.
  const heads = statuses.length > 0 ? [...columns, "Status"] : columns;

  // Width follows content, not position. Giving the first column the widest
  // track assumed it was the important one, which is wrong the moment a table
  // starts with something like an issue number: the id got a third of the
  // width and the title was truncated to nothing. Each column is sized by its
  // longest value instead, clamped so one long cell cannot swallow the row.
  const template = useMemo(() => {
    const statusColumn = statuses.length > 0 ? heads.length - 1 : -1;
    return heads
      .map((head, i) => {
        // the status column has no entry in cells, so it measures its pills
        const longest =
          i === statusColumn
            ? rows.reduce((max, row) => Math.max(max, (row.status ?? "").length + 2), head.length)
            : rows.reduce((max, row) => Math.max(max, (row.cells[i] ?? "").length), head.length);

        // the floor is what a short value needs to stay whole, cell padding
        // included, so an id column never truncates to an ellipsis. The share
        // above that floor is what the column gets when there is room spare.
        const floor = `calc(${Math.min(longest, 12)}ch + 30px)`;
        const share = (Math.min(Math.max(longest, 8), 34) / 10).toFixed(2);
        return `minmax(${floor}, ${share}fr)`;
      })
      .join(" ");
  }, [heads, rows, statuses.length]);

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
              active={filter === null}
              onClick={() => setFilter(null)}
            />
            {statuses.map(([status, count], i) => (
              <Chip
                key={status}
                label={status}
                count={count}
                dot={HUES[i % HUES.length]}
                active={filter === status}
                onClick={() => setFilter(status)}
              />
            ))}
          </>
        )}
      </div>

      <div
        className="overflow-x-auto rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
        style={{ scrollbarWidth: "none" }}
      >
        {/* CSS grid rather than a real <table> so rows can animate their own
            track, so the table roles are supplied explicitly */}
        <div role="table" aria-label={title} aria-rowcount={rows.length + 1} className="min-w-[440px]">
          <div
            role="row"
            className="grid border-b border-[var(--line)] text-[12px] font-medium text-[var(--ink-2)]"
            style={{ gridTemplateColumns: template }}
          >
            {heads.map((column, i) => (
              <span
                key={column}
                role="columnheader"
                className={`px-3 py-2 ${i < heads.length - 1 ? "border-r border-[var(--line)]" : ""}`}
              >
                {column}
              </span>
            ))}
          </div>

          {rows.map((row) => {
            const shown = filter === null || row.status === filter;
            return (
              <div
                key={row.id}
                aria-hidden={!shown}
                {...(!shown ? { inert: true } : {})}
                className="grid transition-[grid-template-rows,opacity] duration-300"
                style={{
                  gridTemplateRows: shown ? "1fr" : "0fr",
                  opacity: shown ? 1 : 0,
                  transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              >
                <div className="overflow-hidden">
                  {/* The row stays a div so role="row" is honest. The link is a
                      real anchor in the first cell whose ::after covers the row,
                      which keeps the whole row clickable without the anchor
                      having to claim to be a row. */}
                  <div
                    role="row"
                    className="group relative grid border-b border-[var(--line)] text-[13px] transition-colors duration-100 hover:bg-[var(--hover)] focus-within:bg-[var(--hover)]"
                    style={{ gridTemplateColumns: template }}
                  >
                    {/* replayed sessions can carry payloads that predate the
                        server-side check, so clamp to the declared columns here too */}
                    {row.cells.slice(0, columns.length).map((cell, i) => (
                      <span
                        key={i}
                        role="cell"
                        className={`flex min-w-0 items-center border-r border-[var(--line)] px-3.5 py-3 ${
                          i === 0 ? "font-medium text-[var(--ink)]" : "text-[var(--ink-2)]"
                        }`}
                      >
                        {i === 0 && row.href ? (
                          <a
                            href={row.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            tabIndex={shown ? 0 : -1}
                            className="truncate outline-none after:absolute after:inset-0 hover:underline"
                          >
                            {cell || "—"}
                          </a>
                        ) : (
                          <span className="truncate">{cell || "—"}</span>
                        )}
                      </span>
                    ))}
                    {statuses.length > 0 && (
                      <span role="cell" className="flex min-w-0 items-center px-3.5 py-3">
                        {row.status ? (
                          <span
                            className="drawn-pill inline-flex h-[26px] shrink-0 items-center rounded-[8px] px-2 text-[13px] font-medium whitespace-nowrap"
                            style={{ "--tag-base": hueFor(row.status) } as React.CSSProperties}
                          >
                            {row.status}
                          </span>
                        ) : (
                          <span className="text-[var(--ink-3)]">—</span>
                        )}
                      </span>
                    )}
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
