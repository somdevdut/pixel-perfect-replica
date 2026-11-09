import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Logo } from "@/components/brand/logo";
import { lovable } from "@/integrations/lovable";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-subtle-gradient">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-card p-7 shadow-card">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

const GOOGLE_SVG = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

/** Google + Lovable sign-in. Both return to the public home page, which forwards signed-in users. */
export function SocialButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();
  async function go(provider: "google" | "lovable") {
    setBusy(provider);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      setBusy(null);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => go("google")}
        disabled={!!busy}
        className="google-btn flex h-10 w-full items-center justify-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {GOOGLE_SVG}
        Continue with Google
      </button>
      <button type="button" className="lovable-auth-button w-full" onClick={() => go("lovable")} disabled={!!busy}>
        Continue with Lovable
      </button>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}
