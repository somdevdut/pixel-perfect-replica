import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-lg bg-brand shadow-glow",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4 text-primary-foreground" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
        <rect x="14.5" y="14.5" width="5" height="5" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ to = "/", className }: { to?: "/" | "/dashboard"; className?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        PixelForge
      </span>
    </Link>
  );
}
