import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import CvMaker from "@/components/tools/cv-maker"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "CV Maker - CreatorKit",
  description: "Build a professional CV or resume with live preview, two templates, and PDF export. Auto-saved. Runs entirely in your browser.",
}

export default function CvMakerPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          All Tools
          <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px] opacity-50">Alt+Left Arrow</kbd>
        </Link>
      </div>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <CvMaker />
      </div>
    </div>
  )
}
