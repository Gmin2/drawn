import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import GlideMenu from "./GlideMenu";
import { Mark, ThemeToggle } from "./Brand";
import {
  IconArrowBoxLeft,
  IconCheckmark1Small,
  IconChevronDownSmall,
  IconCrossSmall,
  IconEditBig,
  IconMagnifyingGlass,
  IconPlugConnector,
  IconSidebarLeftArrow,
  IconSparkle,
} from "./icons";

/* Ported from the reference sidebar: compact workspace switcher, primary rail,
   searchable history, and a collapse that keeps icon alignment while the copy
   slides out. Widths and timings are the reference's own values. */

const WORKSPACE = { name: "TrueForge", monogram: "T" };

export type Recent = { id: string; label: string; prompt: string };

const SIDEBAR_MOTION = {
  expandedWidth: 224,
  collapsedWidth: 52,
  duration: 280,
  copyDuration: 180,
  copyOffset: 8,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};

const CHAT_SEARCH_MOTION = {
  duration: 180,
  closedWidth: 28,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};

function GlideGroup({ children }: { children: ReactNode }) {
  return (
    <GlideMenu
      rowSelector="[data-row]"
      highlightClassName="sidebar-glide-highlight rounded-[7px] bg-[var(--hover-2)]"
      className="group/glide flex flex-col gap-px"
    >
      {children}
    </GlideMenu>
  );
}

function RailButton({
  icon,
  label,
  active = false,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: string;
  onClick?: () => void;
}) {
  return (
    <button
      data-row
      type="button"
      onClick={onClick}
      className={`sidebar-row relative z-10 mx-2 flex h-[34px] items-center rounded-[8px] px-2 text-left transition-[width,background-color,color,transform] duration-150 active:scale-[0.98] ${
        active ? "bg-[var(--hover-2)] group-hover/glide:bg-transparent" : ""
      }`}
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center ${
          active ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
        }`}
      >
        {icon}
      </span>
      <span
        className={`sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-[14px] font-medium ${
          active ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
        }`}
      >
        {label}
      </span>
      {count && (
        <span className="sidebar-copy mr-2 shrink-0 text-[12px] font-medium tabular-nums text-[var(--ink-3)]">
          {count}
        </span>
      )}
    </button>
  );
}

function WorkspaceMenu({
  position,
  onClose,
  connectors,
}: {
  position: { top: number; left: number };
  onClose: () => void;
  connectors: { name: string; note: string }[];
}) {
  return createPortal(
    <div
      data-workspace-menu
      className="fixed z-50 w-64 rounded-[14px] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-overlay)]"
      style={{
        top: position.top,
        left: position.left,
        animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
        transformOrigin: "top left",
      }}
    >
      <GlideMenu
        rowSelector="[data-menu-row]"
        className="flex flex-col gap-px"
        highlightClassName="inset-x-0 rounded-[8px] bg-[var(--hover-2)]"
      >
        <button
          data-menu-row
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-10 w-full items-center gap-1.5 rounded-[8px] px-2 text-left"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--ink)] text-[11px] font-semibold text-[var(--surface)]">
            {WORKSPACE.monogram}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--ink)]">
            {WORKSPACE.name}
          </span>
          <span className="shrink-0 text-[var(--ink)]">
            <IconCheckmark1Small size={18} />
          </span>
        </button>

        <div className="my-1 h-px bg-[var(--line)]" />

        {connectors.map((c) => (
          <button
            key={c.name}
            data-menu-row
            type="button"
            onClick={onClose}
            className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-[8px] px-2 text-left"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-[var(--ink-2)]">
              <IconPlugConnector size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--ink)]">
              {c.name}
            </span>
            <span className="shrink-0 text-[11px] text-[var(--ink-3)]">{c.note}</span>
          </button>
        ))}

        <div className="my-1 h-px bg-[var(--line)]" />

        <a
          data-menu-row
          href="https://github.com/truefoundry/trueforge"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-[8px] px-2 text-left"
        >
          <span className="flex size-5 shrink-0 items-center justify-center text-[var(--ink-2)]">
            <IconArrowBoxLeft size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--ink)]">
            TrueForge on GitHub
          </span>
        </a>
      </GlideMenu>
    </div>,
    document.body,
  );
}

export function SidebarNav({
  recents,
  connectors,
  activeTitle,
  onNewChat,
  onPick,
  turns,
  dark,
  onThemeChange,
}: {
  recents: Recent[];
  connectors: { name: string; note: string }[];
  activeTitle: string | null;
  onNewChat: () => void;
  onPick: (r: Recent) => void;
  turns: number;
  dark: boolean;
  onThemeChange: (v: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspacePosition, setWorkspacePosition] = useState({ top: 0, left: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = recents.filter((r) =>
    r.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!workspaceOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        !target.closest("[data-workspace-trigger]") &&
        !target.closest("[data-workspace-menu]")
      ) {
        setWorkspaceOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [workspaceOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <aside
      data-sidebar-collapsed={collapsed}
      aria-label="Workspace navigation"
      className="group/aside relative flex h-full shrink-0 overflow-hidden border-r border-[var(--line)] py-4 transition-[width]"
      style={
        {
          width: collapsed ? SIDEBAR_MOTION.collapsedWidth : SIDEBAR_MOTION.expandedWidth,
          transitionDuration: `${SIDEBAR_MOTION.duration}ms`,
          transitionTimingFunction: SIDEBAR_MOTION.easing,
          "--sidebar-copy-duration": `${SIDEBAR_MOTION.copyDuration}ms`,
          "--sidebar-copy-offset": `${SIDEBAR_MOTION.copyOffset}px`,
          "--sidebar-easing": SIDEBAR_MOTION.easing,
        } as CSSProperties
      }
    >
      <div className="flex min-h-0 w-[224px] shrink-0 flex-col">
        <div className="px-4">
          <div className="flex items-start justify-between gap-2">
            <span className="sidebar-logo block shrink-0">
              <Mark size={38} />
            </span>
            <span className="sidebar-copy">
              <ThemeToggle dark={dark} onChange={onThemeChange} />
            </span>
          </div>

          <h1 className="sidebar-copy mt-5 text-[18px] leading-[1.28] font-semibold tracking-[-0.3px] text-balance text-[var(--ink)]">
            Generative UI for any MCP server.
          </h1>

          <button
            ref={workspaceButtonRef}
            data-workspace-trigger
            type="button"
            aria-expanded={workspaceOpen}
            tabIndex={collapsed ? -1 : 0}
            onClick={() => {
              if (!workspaceOpen && workspaceButtonRef.current) {
                const rect = workspaceButtonRef.current.getBoundingClientRect();
                setWorkspacePosition({ top: rect.bottom + 6, left: rect.left });
              }
              setWorkspaceOpen((open) => !open);
            }}
            className="sidebar-copy -ml-1.5 mt-2.5 flex h-7 items-center gap-1 rounded-[7px] px-1.5 text-[12.5px] text-[var(--ink-3)] transition-colors duration-150 hover:bg-[var(--hover-2)] hover:text-[var(--ink-2)]"
          >
            {connectors.length} connectors
            <IconChevronDownSmall size={14} />
          </button>

          {workspaceOpen && (
            <WorkspaceMenu
              position={workspacePosition}
              connectors={connectors}
              onClose={() => setWorkspaceOpen(false)}
            />
          )}

          <div className="my-5 border-t border-dashed border-[var(--line-strong)]" />
        </div>

        <button
          type="button"
          aria-label="Collapse sidebar"
          tabIndex={collapsed ? -1 : 0}
          onClick={() => {
            setCollapsed(true);
            setWorkspaceOpen(false);
            setSearchOpen(false);
            setQuery("");
          }}
          className="sidebar-collapse-control absolute top-3.5 right-3 z-20 flex size-7 items-center justify-center rounded-[7px] text-[var(--ink-3)] opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-[var(--hover-2)] hover:text-[var(--ink)] focus-visible:opacity-100 group-hover/aside:opacity-100"
        >
          <IconSidebarLeftArrow size={16} />
        </button>
        <button
          type="button"
          aria-label="Expand sidebar"
          tabIndex={collapsed ? 0 : -1}
          onClick={() => setCollapsed(false)}
          className="sidebar-expand-control absolute top-3.5 left-2.5 z-20 flex size-8 items-center justify-center rounded-[7px] text-[var(--ink-3)] transition-[opacity,background-color,color] duration-150 hover:bg-[var(--hover-2)] hover:text-[var(--ink)]"
        >
          <IconSidebarLeftArrow size={16} className="rotate-180" />
        </button>

        <GlideGroup>
          <RailButton icon={<IconEditBig size={18} />} label="New session" onClick={onNewChat} />
          <RailButton
            icon={<IconPlugConnector size={18} />}
            label="Connectors"
            count={String(connectors.length)}
            onClick={() => {
              if (workspaceButtonRef.current) {
                const rect = workspaceButtonRef.current.getBoundingClientRect();
                setWorkspacePosition({ top: rect.bottom + 6, left: rect.left });
              }
              setWorkspaceOpen(true);
            }}
          />
        </GlideGroup>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <div className="sidebar-copy relative mx-2 mb-1 h-8">
            <div
              aria-hidden={searchOpen}
              className={`absolute inset-0 flex items-center gap-1.5 px-2 text-[12.5px] font-medium text-[var(--ink-3)] transition-[opacity,transform] ${
                searchOpen ? "pointer-events-none -translate-x-1 opacity-0" : "translate-x-0 opacity-100"
              }`}
              style={{
                transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`,
                transitionTimingFunction: CHAT_SEARCH_MOTION.easing,
              }}
            >
              <IconChevronDownSmall size={16} />
              <span>Prompts</span>
            </div>

            <button
              type="button"
              aria-label="Search prompts"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
              className={`absolute top-0 right-0 z-10 flex size-8 items-center justify-center rounded-[8px] text-[var(--ink-3)] transition-[opacity,background-color,color,transform] hover:bg-[var(--hover-2)] hover:text-[var(--ink)] active:scale-[0.96] ${
                searchOpen ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
              style={{ transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms` }}
            >
              <IconMagnifyingGlass size={16} />
            </button>

            <div
              className={`absolute top-0 right-0 z-20 flex h-8 items-center overflow-hidden rounded-[8px] bg-[var(--field)] text-[var(--ink-3)] shadow-[var(--shadow-hairline)] transition-[width,opacity] focus-within:text-[var(--ink-2)] ${
                searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={{
                width: searchOpen ? "100%" : CHAT_SEARCH_MOTION.closedWidth,
                transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`,
                transitionTimingFunction: CHAT_SEARCH_MOTION.easing,
              }}
            >
              <span className="ml-2 flex shrink-0 items-center justify-center">
                <IconMagnifyingGlass size={15} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    setQuery("");
                  }
                }}
                placeholder="Search prompts"
                aria-label="Search prompts"
                className="ml-1.5 min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--ink-3)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--hover-2)] hover:text-[var(--ink)] active:scale-[0.96]"
              >
                <IconCrossSmall size={16} />
              </button>
            </div>
          </div>

          <GlideGroup>
            {visible.map((item) => {
              const active = item.label === activeTitle;
              return (
                <button
                  key={item.id}
                  data-row
                  type="button"
                  title={item.prompt}
                  onClick={() => onPick(item)}
                  className={`sidebar-row relative z-10 mx-2 flex h-[34px] items-center rounded-[8px] px-2 text-left transition-[width,background-color,color,transform] duration-150 active:scale-[0.98] ${
                    active ? "bg-[var(--hover-2)] group-hover/glide:bg-transparent" : ""
                  }`}
                >
                  <span
                    className={`sidebar-copy min-w-0 flex-1 truncate text-[14px] font-medium ${
                      active ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
            {query && visible.length === 0 && (
              <div className="sidebar-copy mx-2 px-2 py-2 text-[12.5px] text-[var(--ink-3)]">
                No prompts found
              </div>
            )}
          </GlideGroup>
        </div>

        <div className="sidebar-copy mx-2 mt-3 w-[208px] border-t border-[var(--line)] pt-3">
          <div className="px-1 pb-2 text-[12px] text-[var(--ink-3)]">
            {turns} {turns === 1 ? "turn" : "turns"} this session
          </div>
          <a
            href="https://github.com/truefoundry/trueforge"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--surface)] text-[12.5px] font-medium text-[var(--ink)] shadow-[var(--shadow-btn)] transition-[background-color,transform] duration-150 hover:bg-[var(--hover)] active:scale-[0.98]"
          >
            Running on TrueForge
            <span className="text-[var(--ink-3)]">→</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
