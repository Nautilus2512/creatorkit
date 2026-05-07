import DocScanner from "@/components/tools/doc-scanner"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Doc Scanner — CreatorKit",
  description: "Scan documents with your camera. Drag 4 corner handles, hit Scan — perspective-corrected output with brightness and contrast controls.",
}

export default function DocScannerPage() {
  return <DocScanner />
}
