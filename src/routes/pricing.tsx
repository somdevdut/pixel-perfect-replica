import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing – PixelForge" },
      { name: "description", content: "PixelForge plans for individuals and teams compressing images at scale." },
      { property: "og:title", content: "Pricing – PixelForge" },
      { property: "og:description", content: "Simple plans for image compression, conversion and batch processing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "forever",
    features: ["Compress, convert & resize", "Batches up to 50 images", "ZIP downloads", "Compression history"],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Pro",
    price: "Coming soon",
    note: "",
    features: ["Everything in Free", "Cloud storage for outputs", "Email notifications", "Advanced analytics"],
    cta: "Join with Free",
    highlight: false,
  },
];

function Pricing() {
  return (
    <MarketingLayout>
      <section className="bg-subtle-gradient border-b">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Simple, honest pricing</h1>
          <p className="mt-3 text-muted-foreground">Everything you need is free today. Paid plans are on the way.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-4xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-2">
        {PLANS.map((p) => (
          <div key={p.name} className={cn("rounded-2xl border bg-card p-7 shadow-card", p.highlight && "border-primary ring-1 ring-primary/30")}>
            <p className="font-medium">{p.name}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {p.price} {p.note && <span className="text-sm font-normal text-muted-foreground">{p.note}</span>}
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-7 w-full" variant={p.highlight ? "brand" : "outline"}>
              <Link to="/register">{p.cta}</Link>
            </Button>
          </div>
        ))}
      </section>
    </MarketingLayout>
  );
}
