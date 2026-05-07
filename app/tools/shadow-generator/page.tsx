import ShadowGenerator from "@/components/tools/shadow-generator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Box Shadow Generator - CreatorKit",
  description: "Build CSS box-shadows visually with multiple layers. Adjust offsets, blur, spread, color, and opacity.",
}

export default function ShadowGeneratorPage() {
  return <ShadowGenerator />
}
