import ColorPaletteExtractor from "@/components/tools/color-palette-extractor"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Color Palette Extractor - CreatorKit", description: "Extract dominant colors from any image. Copy HEX, RGB, or HSL values. Runs entirely in your browser." }
export default function Page() { return <ColorPaletteExtractor /> }
