import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
] as const;

function SiteHeader() {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {ready && user ? (
            <Button asChild variant="brand">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Login</Link>
              </Button>
              <Button asChild variant="brand">
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
        <button
          className="inline-flex size-9 items-center justify-center rounded-md border md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col py-2">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex gap-2">
            {user ? (
              <Button asChild variant="brand" className="flex-1">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/auth">Login</Link>
                </Button>
                <Button asChild variant="brand" className="flex-1">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Compress, convert and resize images without giving up quality.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm sm:grid-cols-3">
          <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          <a href="/#features" className="text-muted-foreground hover:text-foreground">Features</a>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {year} PixelForge. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SimplePage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <MarketingLayout>
      <section className="bg-subtle-gradient border-b">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        </div>
      </section>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-[15px] leading-7 text-muted-foreground sm:px-6 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        {children}
      </div>
    </MarketingLayout>
  );
}
