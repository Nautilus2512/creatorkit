"use client"

import { useState, useMemo } from "react"
import { marked } from "marked"
import { Copy, Check, Eye, Code, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const EXAMPLE = `# Hello, World!

This is **bold** and this is *italic* text.

## Features

- Live HTML preview
- Raw HTML output
- File upload and download

> Blockquotes look great too.

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

[Visit CreatorKit](https://creatorkit-tools.vercel.app) for more tools.

---

### Table Example

| Name    | Role      |
| ------- | --------- |
| Alice   | Designer  |
| Bob     | Developer |
`

export default function MarkdownToHtml() {
  const [input, setInput] = useState("")
  const [view, setView] = useState<"preview" | "html">("preview")
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => {
    if (!input.trim()) return ""
    return marked(input) as string
  }, [input])

  const copy = () => {
    navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "output.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setInput(reader.result as string)
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Markdown → HTML</h2>
          <p className="text-muted-foreground">Convert Markdown to HTML with live preview. Runs entirely in your browser.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy} disabled={!html}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy HTML"}
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={!html}>
            <Download className="h-4 w-4 mr-1" />.html
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Markdown Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Markdown</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setInput(EXAMPLE)}>Example</Button>
              <label className="cursor-pointer">
                <input type="file" accept=".md,.txt,.markdown" className="hidden" onChange={handleFile} />
                <Button variant="ghost" size="sm" asChild><span><Upload className="h-4 w-4 mr-1" />Upload</span></Button>
              </label>
            </div>
          </div>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={"# Hello World\n\nWrite your **Markdown** here..."} className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4" />
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <div className="flex gap-1">
              <Button variant={view === "preview" ? "default" : "ghost"} size="sm" onClick={() => setView("preview")}>
                <Eye className="h-4 w-4 mr-1" />Preview
              </Button>
              <Button variant={view === "html" ? "default" : "ghost"} size="sm" onClick={() => setView("html")}>
                <Code className="h-4 w-4 mr-1" />HTML
              </Button>
            </div>
          </div>
          {view === "preview" ? (
            <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: html || '<p style="color: var(--muted-foreground)">Preview will appear here...</p>' }}
            />
          ) : (
            <Textarea value={html} readOnly placeholder="HTML output will appear here..." className="flex-1 resize-none border-0 rounded-none font-mono text-xs focus-visible:ring-0 bg-muted/10 p-4" />
          )}
          {html && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4">
              <span>{input.trim().split(/\s+/).filter(Boolean).length} words in</span>
              <span>{html.length} chars out</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
