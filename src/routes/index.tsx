import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Cloud,
  Crop,
  Download,
  FileImage,
  Gauge,
  Layers,
  Repeat,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import heroSample from "@/assets/hero-sample.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PixelForge – Compress Images. Preserve Quality. Save Space." },
      {
        name: "description",
        content:
          "Optimize, convert and resize JPEG, PNG, WebP and AVIF images in seconds. Batch compression, ZIP downloads and metadata removal.",
      },
      { property: "og:title", content: "PixelForge – Image Compression Studio" },
      {
        property: "og:description",
        content: "Compress hundreds of images in seconds without compromising visual quality.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Gauge, title: "Smart Image Compression", body: "Fine-tune quality from 1–100 and see the exact bytes saved on every file." },
  { icon: Repeat, title: "Multi-Format Conversion", body: "Move freely between JPEG, PNG, WebP and AVIF — including modern AVIF encoding." },
  { icon: Layers, title: "Batch Image Processing", body: "Drop up to 50 images, process them in parallel and grab one tidy ZIP." },
  { icon: Crop, title: "Image Resize and Crop", body: "Presets, custom sizes, fit or cover, and smart crops that keep the subject in frame." },
  { icon: ShieldCheck, title: "Metadata Removal", body: "Strip EXIF data like GPS location and camera details before you share." },
  { icon: Cloud, title: "Secure Cloud Storage", body: "Every job is saved to your private account history, tied to your login." },
  { icon: Zap, title: "Real-Time Progress Tracking", body: "Watch each file move from pending to done, with live overall progress." },
  { icon: BarChart3, title: "Compression Analytics", body: "Track storage saved, format mix and activity over time." },
];

const STEPS = [
  { icon: Upload, title: "Upload your images", body: "Drag and drop or browse. We check every file's real type before touching it." },
  { icon: SlidersHorizontal, title: "Choose your settings", body: "Pick an output format, quality, dimensions and metadata handling." },
  { icon: Sparkles, title: "Process and optimize", body: "Images are re-encoded with tuned codecs and compared side by side." },
  { icon: Download, title: "Download or save", body: "Grab single files or a ZIP. Results are logged in your history." },
];

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand opacity-10 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="flex items-center gap-1.5 border-b bg-surface px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 text-xs text-muted-foreground">Image Compressor</span>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_200px]">
          <div className="relative overflow-hidden rounded-lg">
            <img src={heroSample} alt="Alpine lake sample image being compressed" width={1280} height={832} className="block w-full" />
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-card" />
            <span className="absolute top-2 left-2 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium">Original · 4.8 MB</span>
            <span className="absolute top-2 right-2 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium">WebP · 612 KB</span>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <p className="mb-1.5 font-medium">Output format</p>
              <div className="grid grid-cols-2 gap-1">
                {["JPEG", "PNG", "WebP", "AVIF"].map((f) => (
                  <span key={f} className={`rounded-md border px-2 py-1 text-center ${f === "WebP" ? "border-primary bg-primary-soft text-accent-foreground" : "text-muted-foreground"}`}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between font-medium"><span>Quality</span><span className="font-mono">80%</span></div>
              <div className="h-1.5 rounded-full bg-muted"><div className="h-full w-4/5 rounded-full bg-brand" /></div>
            </div>
            <div className="rounded-lg bg-success-soft p-3">
              <p className="text-muted-foreground">Saved</p>
              <p className="font-mono text-lg font-semibold text-success">−87.3%</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Illustrative example — your results depend on the image.</p>
    </div>
  );
}

function Landing() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b bg-subtle-gradient">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <span className="size-1.5 rounded-full bg-primary" /> JPEG · PNG · WebP · AVIF
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Compress Images. <span className="text-brand">Preserve Quality.</span> Save Space.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Optimize, convert and manage your images with an intelligent image processing platform. Compress hundreds of images in seconds without compromising visual quality.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="brand" size="lg">
                <Link to="/dashboard/compress">
                  <Upload /> Upload Images
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features">Explore Features <ArrowRight /></a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                ["Up to 90%", "smaller files"],
                ["50", "images per batch"],
                ["4", "supported formats"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-mono text-xl font-semibold tabular">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything you need to ship lighter images</h2>
            <p className="mt-3 text-muted-foreground">One workspace for compression, conversion, resizing and cleanup.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-brand group-hover:text-primary-foreground">
                  <f.icon className="size-4" />
                </span>
                <h3 className="mt-4 font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">How It Works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">From upload to optimized in four steps</h2>
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border bg-card p-5 shadow-soft">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <s.icon className="mt-3 size-5 text-primary" />
                <h3 className="mt-3 font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-primary">Supported Formats</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Modern codecs, classic compatibility</h2>
              <p className="mt-3 text-muted-foreground">
                Read and write the four formats that cover nearly every website, app and inbox.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["JPEG", "Photos, universal"],
                ["PNG", "Graphics, transparency"],
                ["WebP", "Web, great balance"],
                ["AVIF", "Smallest files"],
              ].map(([f, d]) => (
                <div key={f} className="rounded-xl border bg-card p-4 text-center shadow-soft">
                  <FileImage className="mx-auto size-5 text-primary" />
                  <p className="mt-2 font-mono text-sm font-semibold">{f}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 overflow-hidden rounded-2xl bg-brand px-6 py-12 text-center shadow-glow sm:px-12">
            <h2 className="text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">Start compressing in seconds</h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">Create a free account and keep a full history of every image you optimize.</p>
            <Button asChild size="lg" variant="secondary" className="mt-7">
              <Link to="/register">Get Started free <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
