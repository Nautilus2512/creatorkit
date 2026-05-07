import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ElectricalCalculator from "@/components/tools/electrical-calculator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Electrical Engineering Calculator — CreatorKit",
  description: "Ohm's Law, AC reactance, power, three-phase, resistor color codes, and RC/RL time constants. IEC/IEEE standards with SI units.",
}

export default function ElectricalCalculatorPage() {
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
        <ElectricalCalculator />
      </div>
    </div>
  )
}
