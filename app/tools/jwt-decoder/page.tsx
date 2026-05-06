import JwtDecoder from "@/components/tools/jwt-decoder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "JWT Decoder - CreatorKit",
  description: "Decode and inspect JSON Web Tokens — view header, payload, and expiry info. Runs entirely in your browser.",
}

export default function JwtDecoderPage() {
  return <JwtDecoder />
}
