"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error("Sheet components must be used within <Sheet>.");
  }

  return context;
}

function Sheet({
  children,
  open: openProp,
  onOpenChange,
}: {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;

  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      const nextValue = typeof value === "function" ? value(open) : value;

      if (openProp === undefined) {
        setInternalOpen(nextValue);
      }

      onOpenChange?.(nextValue);
    },
    [onOpenChange, open, openProp],
  );

  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

function SheetTrigger({
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}) {
  const { setOpen } = useSheetContext();

  return React.cloneElement(children, {
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      setOpen(true);
    },
  });
}

function SheetContent({
  children,
  className,
  side = "right",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "left" | "right";
}) {
  const { open, setOpen } = useSheetContext();

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Close sheet overlay"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => setOpen(false)}
        type="button"
      />
      <div
        className={cn(
          "fixed inset-y-0 z-50 w-[88%] max-w-sm border-border bg-background shadow-2xl sm:w-full",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
      >
        <button
          aria-label="Close sheet"
          className="absolute top-4 right-4 rounded-full p-2 text-current/70 transition-colors hover:bg-white/10 hover:text-current"
          onClick={() => setOpen(false)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </>
  );
}

export { Sheet, SheetContent, SheetTrigger };
