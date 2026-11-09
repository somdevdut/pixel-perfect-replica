import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/marketing/marketing-layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About – PixelForge" },
      { name: "description", content: "Why we built PixelForge, the image compression studio." },
      { property: "og:title", content: "About – PixelForge" },
      { property: "og:description", content: "Why we built PixelForge, the image compression studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SimplePage eyebrow="About" title="Lighter images, faster everything">
      <p>
        PixelForge helps designers, developers and content teams ship smaller images without
        visible quality loss. Smaller images mean faster pages, cheaper storage and happier users.
      </p>
      <h2>How processing works</h2>
      <p>
        Images are decoded and re-encoded on your device using tuned JPEG, PNG, WebP and AVIF
        encoders, so your originals are never uploaded to process them. Job details such as file
        names, sizes and savings are stored in your private account history.
      </p>
    </SimplePage>
  ),
});
