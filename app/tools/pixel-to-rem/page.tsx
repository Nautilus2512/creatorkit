import PixelToRem from "@/components/tools/pixel-to-rem"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pixel → REM Converter - CreatorKit",
  description: "Convert between px and rem units with a configurable root font size and reference table.",
}

export default function PixelToRemPage() {
  return <PixelToRem />
}
