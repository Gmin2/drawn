import { useEffect, useState, type ReactNode } from "react";
import { SidebarNav, type Recent } from "./SidebarNav";

export function Shell({
  children,
  onReset,
  turns,
  recents,
  connectors,
  activeTitle,
  onPick,
}: {
  children: ReactNode;
  onReset: () => void;
  turns: number;
  recents: Recent[];
  connectors: { name: string; note: string }[];
  activeTitle: string | null;
  onPick: (r: Recent) => void;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="hatch flex h-dvh w-full justify-center overflow-hidden">
      <div className="flex w-full max-w-[1120px] bg-[var(--page)]">
        <div className="hidden md:flex">
          <SidebarNav
            recents={recents}
            connectors={connectors}
            activeTitle={activeTitle}
            turns={turns}
            onNewChat={onReset}
            onPick={onPick}
            dark={dark}
            onThemeChange={setDark}
          />
        </div>

        <main className="relative flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
