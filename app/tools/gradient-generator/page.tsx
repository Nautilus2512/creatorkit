import GradientGenerator from "@/components/tools/gradient-generator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gradient Generator - CreatorKit",
  description: "Build CSS linear, radial, and conic gradients visually. Copy the CSS code instantly.",
}

export default function GradientGeneratorPage() {
  return <GradientGenerator />
}
