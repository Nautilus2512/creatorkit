import ColorConverter from "@/components/tools/color-converter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Color Converter - CreatorKit",
  description: "Convert colors between HEX, RGB, HSL, and OKLCH formats instantly. Runs entirely in your browser.",
}

export default function ColorConverterPage() {
  return <ColorConverter />
}
