import BorderRadiusVisualizer from "@/components/tools/border-radius-visualizer"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Border Radius Visualizer - CreatorKit",
  description: "Build CSS border-radius values visually with presets, per-corner sliders, and instant copy.",
}

export default function BorderRadiusVisualizerPage() {
  return <BorderRadiusVisualizer />
}
