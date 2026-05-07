import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import InvoiceGenerator from "@/components/tools/invoice-generator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Invoice Generator — CreatorKit",
  description: "Create professional invoices with live preview. Add line items, tax, and notes. Export as PDF. Auto-saved locally — never uploaded.",
}

export default function InvoiceGeneratorPage() {
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
        <InvoiceGenerator />
      </div>
    </div>
  )
}
