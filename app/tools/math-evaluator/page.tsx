import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import MathEvaluator from "@/components/tools/math-evaluator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Math Calculator — CreatorKit",
  description: "Evaluate math expressions, assign variables, and convert units. Powered by mathjs — runs entirely in your browser.",
}

export default function MathEvaluatorPage() {
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
        <MathEvaluator />
      </div>
    </div>
  )
}
