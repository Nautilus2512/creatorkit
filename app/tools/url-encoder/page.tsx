import UrlEncoder from "@/components/tools/url-encoder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "URL Encoder / Decoder - CreatorKit",
  description: "Encode or decode URL components and full URLs using encodeURIComponent and encodeURI. Runs entirely in your browser.",
}

export default function UrlEncoderPage() {
  return <UrlEncoder />
}
