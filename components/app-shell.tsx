import type { ReactNode } from "react";
import { BriefcaseBusiness, FileText, LayoutDashboard, Menu, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarNavigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className="flex flex-col gap-2">
      {navigationItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
            "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground",
            mobile && "text-base",
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SidebarPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 px-6 py-6">
        <div className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-sidebar-foreground/70 uppercase">
          CareerOS
        </div>
        <div>
          <h1 className="text-xl font-semibold text-sidebar-foreground">Career Command Center</h1>
          <p className="mt-1 text-sm text-sidebar-muted">
            Single-user AI career assistant foundation.
          </p>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <div className="flex-1 px-4 py-4">
        <SidebarNavigation />
      </div>
      <div className="px-6 py-5 text-xs text-sidebar-muted">
        Phase 1 focuses on structure, storage, and the Resume Brain.
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[var(--sidebar)] lg:block">
        <SidebarPanel />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                Foundation
              </p>
              <h2 className="text-lg font-semibold">CareerOS</h2>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="border-r-0 bg-[var(--sidebar)] p-0 text-sidebar-foreground">
                <SidebarPanel />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
