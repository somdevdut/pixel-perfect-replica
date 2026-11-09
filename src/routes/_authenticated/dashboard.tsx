import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Cloud,
  Crop,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Minimize2,
  Repeat,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { displayName } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – PixelForge" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/compress", label: "Image Compressor", icon: Minimize2 },
  { to: "/dashboard/batch", label: "Batch Processing", icon: Layers },
  { to: "/dashboard/convert", label: "Format Converter", icon: Repeat },
  { to: "/dashboard/resize", label: "Resize & Crop", icon: Crop },
  { to: "/dashboard/history", label: "Compression History", icon: History },
  { to: "/dashboard/storage", label: "Cloud Storage", icon: Cloud },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = displayName(user);
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo to="/dashboard" />
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Dashboard">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: "exact" in item && item.exact }}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-muted"
            activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground font-medium" }}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-primary-foreground">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar lg:block">
        <SidebarNav />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className={cn("inline-flex size-9 items-center justify-center rounded-md border bg-card")}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
          <Logo to="/dashboard" />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
