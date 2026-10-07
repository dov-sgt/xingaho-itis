"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function DropdownMenu({ trigger, children, align = "end" }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
              align === "end" && "right-0",
              align === "start" && "left-0",
              align === "center" && "left-1/2 -translate-x-1/2"
            )}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-muted" />;
}
