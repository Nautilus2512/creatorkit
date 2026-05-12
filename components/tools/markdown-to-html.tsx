"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { marked } from "marked"
import { Copy, Check, Eye, Code, Upload, Download, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

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
  const [downloaded, setDownloaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const html = useMemo(() => {
    if (!input.trim()) return ""
    return marked(input) as string
  }, [input])

  const copy = useCallback(() => {
    if (!html) return
    navigator.clipboard.writeText(html)
    setCopied(true)
    announceToScreenReader("HTML copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [html])

  const download = useCallback(() => {
    if (!html) return
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "output.html"
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    announceToScreenReader("HTML file downloaded")
    setTimeout(() => setDownloaded(false), 2000)
  }, [html])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setInput(reader.result as string); announceToScreenReader(`${file.name} uploaded`) }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c" && html) {
        e.preventDefault()
        copy()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s" && html) {
        e.preventDefault()
        download()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("File upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        setInput(EXAMPLE)
        announceToScreenReader("Example loaded")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault()
        setView(view === "preview" ? "html" : "preview")
        announceToScreenReader(view === "preview" ? "HTML view" : "Preview view")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [html, copy, download, view])

  return (
    <>
      <ShortcutsModal
        pageName="Markdown to HTML"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "O"], description: "Upload file" },
          { keys: ["Ctrl", "Shift", "E"], description: "Load example" },
          { keys: ["Ctrl", "Shift", "V"], description: "Toggle preview/HTML" },
          { keys: ["Ctrl", "Shift", "C"], description: "Copy HTML" },
          { keys: ["Ctrl", "Shift", "S"], description: "Download HTML" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
      <div className="flex h-full flex-col gap-3 p-4" role="main" aria-label="Markdown to HTML tool">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Markdown → HTML</h2>
            <p className="text-muted-foreground">Convert Markdown to HTML with live preview. Runs entirely in your browser. Press ? for shortcuts.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copy()} 
              disabled={!html}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={copied ? "HTML copied to clipboard" : "Copy HTML to clipboard"}
            >
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy HTML"}
              {html && <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+C</kbd>}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => download()} 
              disabled={!html}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={downloaded ? "HTML file downloaded" : "Download HTML file"}
            >
              {downloaded ? <FileCheck className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
              {downloaded ? "Saved!" : ".html"}
              {html && <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+S</kbd>}
            </Button>
          </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Markdown Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="markdown-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="markdown-panel-label">Markdown</span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setInput(EXAMPLE); announceToScreenReader("Example loaded") }}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Load example markdown"
              >
                Example
                <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+E</kbd>
              </Button>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept=".md,.txt,.markdown" 
                  className="hidden" 
                  onChange={handleFile}
                  ref={fileInputRef}
                  aria-label="Upload markdown file"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => announceToScreenReader("File upload dialog opened")}
                  aria-label="Upload markdown file"
                >
                  <span className="flex items-center gap-1"><Upload className="h-4 w-4" aria-hidden="true" />Upload<kbd className="ml-1 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+O</kbd></span>
                </Button>
              </label>
            </div>
          </div>
          <Textarea 
            value={input} 
            onChange={(e) => { setInput(e.target.value); announceToScreenReader("Markdown input updated") }} 
            placeholder={"# Hello World\n\nWrite your **Markdown** here..."} 
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Markdown input"
            id="markdown-input"
          />
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="output-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-panel-label">Output</span>
            <div className="flex gap-1" role="group" aria-label="Output view toggle">
              <Button 
                variant={view === "preview" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => { setView("preview"); announceToScreenReader("Preview view") }}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-pressed={view === "preview"}
                aria-label="Show preview view"
              >
                <Eye className="h-4 w-4 mr-1" aria-hidden="true" />Preview
              </Button>
              <Button 
                variant={view === "html" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => { setView("html"); announceToScreenReader("HTML view") }}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-pressed={view === "html"}
                aria-label="Show HTML view"
              >
                <Code className="h-4 w-4 mr-1" aria-hidden="true" />HTML
              </Button>
              <kbd className="flex items-center text-[10px] text-muted-foreground opacity-60 ml-1" aria-hidden="true">Ctrl+Shift+V</kbd>
            </div>
          </div>
          {view === "preview" ? (
            <div 
              className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: html || '<p style="color: var(--muted-foreground)">Preview will appear here...</p>' }}
              role="region"
              aria-label="HTML preview"
            />
          ) : (
            <Textarea 
              value={html} 
              readOnly 
              placeholder="HTML output will appear here..." 
              className="flex-1 resize-none border-0 rounded-none font-mono text-xs focus-visible:ring-0 bg-muted/10 p-4"
              aria-label="HTML output"
            />
          )}
          {html && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
              <span>{input.trim().split(/\s+/).filter(Boolean).length} words in</span>
              <span>{html.length} chars out</span>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
