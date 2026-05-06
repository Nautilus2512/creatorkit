import TextCaseConverter from "@/components/tools/text-case-converter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Text Case Converter - CreatorKit",
  description: "Convert text between upper, lower, title, camel, snake, and kebab cases",
}

export default function TextCaseConverterPage() {
  return <TextCaseConverter />
}