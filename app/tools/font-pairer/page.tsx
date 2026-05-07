import FontPairer from "@/components/tools/font-pairer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Font Pairer — CreatorKit",
  description: "Browse and pair Google Fonts for your next project. Preview heading and body combinations with light, dark, and sepia themes.",
}

export default function FontPairerPage() {
  return <FontPairer />
}
