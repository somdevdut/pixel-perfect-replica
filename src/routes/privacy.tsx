import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/marketing/marketing-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy – PixelForge" },
      { name: "description", content: "How PixelForge handles your images and account data." },
      { property: "og:title", content: "Privacy Policy – PixelForge" },
      { property: "og:description", content: "How PixelForge handles your images and account data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SimplePage eyebrow="Legal" title="Privacy Policy">
      <p>This page is a starting template. Replace it with a policy reviewed for your business.</p>
      <h2>Images</h2>
      <p>Images are processed on your device. Originals and outputs are not uploaded unless you choose to save them to cloud storage.</p>
      <h2>Account data</h2>
      <p>We store your name, email and a log of jobs (file names, formats, sizes, dates) so you can see your history and analytics. Only you can read these records.</p>
      <h2>Metadata</h2>
      <p>When "Remove Image Metadata" is enabled, EXIF data such as GPS location and camera details is removed from outputs.</p>
    </SimplePage>
  ),
});
