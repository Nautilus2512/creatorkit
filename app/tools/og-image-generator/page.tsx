import OgImageGenerator from "@/components/tools/og-image-generator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "OG Image Generator — CreatorKit",
  description: "Generate Open Graph images for social media. 4 templates, custom colors and fonts. 1200×630 PNG rendered in your browser.",
}

export default function OgImageGeneratorPage() {
  return <OgImageGenerator />
}
