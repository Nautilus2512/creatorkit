import MarkdownToHtml from "@/components/tools/markdown-to-html"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Markdown → HTML - CreatorKit",
  description: "Convert Markdown to HTML with live preview and raw HTML output. Runs entirely in your browser.",
}

export default function MarkdownToHtmlPage() {
  return <MarkdownToHtml />
}
