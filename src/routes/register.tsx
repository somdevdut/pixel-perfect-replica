import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, OrDivider, SocialButtons } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account – PixelForge" },
      { name: "description", content: "Create a free PixelForge account to compress, convert and resize images." },
      { property: "og:title", content: "Create account – PixelForge" },
      { property: "og:description", content: "Create a free PixelForge account to compress, convert and resize images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

function Register() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard", replace: true });
  }, [ready, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${window.location.origin}/auth` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) navigate({ to: "/dashboard" });
    else setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" footer={<Link to="/auth" className="font-medium text-primary hover:underline">Back to login</Link>}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MailCheck className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>. Click it to activate your account, then log in.
          </p>
        </div>
      </AuthShell>
    );
  }

  const field = (key: keyof typeof form, label: string, type: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        autoComplete={autoComplete}
        value={form[key]}
        aria-invalid={!!errors[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever. No credit card required."
      footer={
        <>
          Already have an account? <Link to="/auth" className="font-medium text-primary hover:underline">Log in</Link>
        </>
      }
    >
      <SocialButtons />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field("fullName", "Full Name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("confirm", "Confirm Password", "password", "new-password")}
        <Button type="submit" variant="brand" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
    </AuthShell>
  );
}
