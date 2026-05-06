import JsonFormatter from "@/components/tools/json-formatter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "JSON Formatter - CreatorKit",
  description: "Format, validate, and minify JSON with syntax highlighting",
}

export default function JsonFormatterPage() {
  return <JsonFormatter />
}