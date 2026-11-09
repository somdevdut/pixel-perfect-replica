import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/marketing/marketing-layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact – PixelForge" },
      { name: "description", content: "Get in touch with the PixelForge team." },
      { property: "og:title", content: "Contact – PixelForge" },
      { property: "og:description", content: "Get in touch with the PixelForge team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SimplePage eyebrow="Contact" title="We'd love to hear from you">
      <p>Questions, feedback or partnership ideas? Email us and we'll reply within two business days.</p>
      <p>
        <a className="font-medium text-primary hover:underline" href="mailto:hello@pixelforge.app">hello@pixelforge.app</a>
      </p>
    </SimplePage>
  ),
});
