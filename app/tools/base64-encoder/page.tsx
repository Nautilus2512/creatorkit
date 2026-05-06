import Base64Encoder from "@/components/tools/base64-encoder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Base64 Encoder / Decoder - CreatorKit",
  description: "Encode text or files to Base64, or decode Base64 back to plain text. Runs entirely in your browser.",
}

export default function Base64EncoderPage() {
  return <Base64Encoder />
}
