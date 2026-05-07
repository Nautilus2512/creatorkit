import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Base64Encoder from "@/components/tools/base64-encoder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Base64 Encoder / Decoder - CreatorKit",
  description: "Encode text or files to Base64, or decode Base64 back to plain text. Runs entirely in your browser.",
}

export default function Base64EncoderPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          All Tools
          <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px] opacity-50">Alt+Left Arrow</kbd>
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <Base64Encoder />
      </div>
    </div>
  )
}
