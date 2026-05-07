import TotpGenerator from "@/components/tools/totp-generator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "TOTP / 2FA Generator - CreatorKit",
  description: "Generate TOTP codes from a base32 secret. Compatible with Google Authenticator. Runs entirely in your browser.",
}

export default function TotpGeneratorPage() {
  return <TotpGenerator />
}
