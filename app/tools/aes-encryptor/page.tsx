import AesEncryptor from "@/components/tools/aes-encryptor"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AES Encrypt / Decrypt - CreatorKit",
  description: "Encrypt and decrypt text with AES-256-GCM and PBKDF2 key derivation. Runs entirely in your browser.",
}

export default function AesEncryptorPage() {
  return <AesEncryptor />
}
