import Link from "next/link"
import { ScreenshotToMockup } from "@/components/tools/screenshot-to-mockup"
import { ArrowLeft } from "lucide-react"

export default function ScreenshotToMockupPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-none px-3 py-4 md:px-4">
        <div className="mb-4">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            All Tools
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px] opacity-50">Alt+Left Arrow</kbd>
          </Link>
        </div>
        <ScreenshotToMockup />
      </main>
    </div>
  )
}
