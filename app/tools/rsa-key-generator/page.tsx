import RsaKeyGenerator from "@/components/tools/rsa-key-generator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "RSA Key Generator - CreatorKit",
  description: "Generate RSA-OAEP key pairs in PEM format. Choose 2048 or 4096-bit keys. Runs entirely in your browser.",
}

export default function RsaKeyGeneratorPage() {
  return <RsaKeyGenerator />
}
