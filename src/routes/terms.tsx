import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/marketing/marketing-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service – PixelForge" },
      { name: "description", content: "The terms for using PixelForge." },
      { property: "og:title", content: "Terms of Service – PixelForge" },
      { property: "og:description", content: "The terms for using PixelForge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SimplePage eyebrow="Legal" title="Terms of Service">
      <p>This page is a starting template. Replace it with terms reviewed for your business.</p>
      <h2>Your content</h2>
      <p>You keep all rights to the images you process. Only upload images you have the right to use.</p>
      <h2>Fair use</h2>
      <p>Batches are limited to 50 images of up to 25 MB each to keep the service fast for everyone.</p>
      <h2>No warranty</h2>
      <p>The service is provided as is. Always keep your original files.</p>
    </SimplePage>
  ),
});
