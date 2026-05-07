import EngineeringCalculator from "@/components/tools/engineering-calculator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Engineering Calculator — CreatorKit",
  description: "Scientific calculator with trig functions, logarithms, DEG/RAD mode, physical constants, and unit support. Powered by mathjs.",
}

export default function EngineeringCalculatorPage() {
  return <EngineeringCalculator />
}
