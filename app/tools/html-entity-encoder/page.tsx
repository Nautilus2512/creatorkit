import HtmlEntityEncoder from "@/components/tools/html-entity-encoder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "HTML Entity Encoder / Decoder - CreatorKit",
  description: "Encode special characters to HTML entities or decode them back. Runs entirely in your browser.",
}

export default function HtmlEntityEncoderPage() {
  return <HtmlEntityEncoder />
}
