import MathEvaluator from "@/components/tools/math-evaluator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Math Calculator — CreatorKit",
  description: "Evaluate math expressions, assign variables, and convert units. Powered by mathjs — runs entirely in your browser.",
}

export default function MathEvaluatorPage() {
  return <MathEvaluator />
}
