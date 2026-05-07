import JsFormatter from "@/components/tools/js-formatter"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "JS Formatter — CreatorKit",
  description: "Format JavaScript, TypeScript, CSS, HTML, JSON, and Markdown with Prettier. Runs entirely in your browser — nothing is uploaded.",
}

export default function JsFormatterPage() {
  return <JsFormatter />
}
