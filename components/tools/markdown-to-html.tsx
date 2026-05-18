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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && html) {
        e.preventDefault()
        copy()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s" && html) {
        e.preventDefault()
        download()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("File upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        setInput(EXAMPLE)
        announceToScreenReader("Example loaded")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault()
        setView(view === "preview" ? "html" : "preview")
        announceToScreenReader(view === "preview" ? "HTML view" : "Preview view")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [html, copy, download, view])

  return (
    <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Markdown to HTML tool">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Markdown → HTML</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Markdown to HTML" shortcuts={[
            { keys: ["Ctrl", "Shift", "U"], description: "Upload file" },
            { keys: ["Ctrl", "Shift", "E"], description: "Load example" },
            { keys: ["Ctrl", "Shift", "L"], description: "Toggle preview/HTML" },
            { keys: ["Ctrl", "Shift", "V"], description: "Copy HTML" },
            { keys: ["Ctrl", "Shift", "S"], description: "Download HTML" },
          ]} />
          <Button variant="outline" size="sm" onClick={copy} disabled={!html} aria-label={copied ? "HTML copied" : "Copy HTML"}>
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy HTML"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
          <Button variant={downloaded ? "outline" : "default"} size="sm" onClick={download} disabled={!html} aria-label={downloaded ? "Downloaded" : "Download HTML"}>
            {downloaded ? <FileCheck className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
            {downloaded ? "Saved!" : ".html"}
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${downloaded ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Markdown → HTML</h2>
          <ShortcutsModal pageName="Markdown to HTML" shortcuts={[
            { keys: ["Ctrl", "Shift", "U"], description: "Upload file" },
            { keys: ["Ctrl", "Shift", "V"], description: "Copy HTML" },
            { keys: ["Ctrl", "Shift", "S"], description: "Download HTML" },
          ]} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Markdown
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Output
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left — Markdown Input */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="markdown-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="markdown-panel-label">Markdown</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setInput(EXAMPLE); announceToScreenReader("Example loaded") }} aria-label="Load example markdown">
                Example <kbd className="ml-1 hidden md:inline rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+E</kbd>
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".md,.txt,.markdown" className="hidden" onChange={handleFile} ref={fileInputRef} aria-label="Upload markdown file" />
                <Button variant="ghost" size="sm" asChild aria-label="Upload markdown file">
                  <span className="flex items-center gap-1"><Upload className="h-4 w-4" aria-hidden="true" />Upload<kbd className="ml-1 hidden md:inline rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+U</kbd></span>
                </Button>
              </label>
            </div>
          </div>
          <Textarea value={input} onChange={(e) => { setInput(e.target.value); announceToScreenReader("Markdown input updated") }} placeholder={"# Hello World\n\nWrite your **Markdown** here..."} className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4" aria-label="Markdown input" id="markdown-input" />
        </div>

        {/* Right — Output */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="output-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-panel-label">Output</span>
            <div className="flex gap-1" role="group" aria-label="Output view toggle">
              <Button variant={view === "preview" ? "default" : "ghost"} size="sm" onClick={() => { setView("preview"); announceToScreenReader("Preview view") }} aria-pressed={view === "preview"} aria-label="Show preview">
                <Eye className="h-4 w-4 mr-1" aria-hidden="true" />Preview
              </Button>
              <Button variant={view === "html" ? "default" : "ghost"} size="sm" onClick={() => { setView("html"); announceToScreenReader("HTML view") }} aria-pressed={view === "html"} aria-label="Show HTML">
                <Code className="h-4 w-4 mr-1" aria-hidden="true" />HTML
              </Button>
              <kbd className="flex items-center text-[10px] text-muted-foreground opacity-60 ml-1" aria-hidden="true">Ctrl+Shift+L</kbd>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {view === "preview" ? (
              <div
                className="p-4 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: html || '<p style="color: var(--muted-foreground)">Preview will appear here...</p>' }}
                role="region"
                aria-label="HTML preview"
              />
            ) : (
              <Textarea value={html} readOnly placeholder="HTML output will appear here..." className="min-h-[300px] w-full resize-none border-0 rounded-none font-mono text-xs focus-visible:ring-0 bg-muted/10 p-4" aria-label="HTML output" />
            )}
            <div className="p-4 pt-0">
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Type or paste Markdown in the left panel. The output updates live as you type.</li>
                  <li>Use <span className="text-foreground font-medium">Preview</span> to see the rendered HTML, or <span className="text-foreground font-medium">HTML</span> to inspect the raw markup. Toggle with <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd>.</li>
                  <li>Click <span className="text-foreground font-medium">Upload</span> to load a <span className="text-foreground font-medium">.md</span> or <span className="text-foreground font-medium">.txt</span> file, or <span className="text-foreground font-medium">Example</span> to load a sample document.</li>
                  <li>Use <span className="text-foreground font-medium">Copy HTML</span> to copy the raw markup, or <span className="text-foreground font-medium">.html</span> to download it as a file.</li>
                </ol>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tips</p>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    <li>Tables, code blocks, and blockquotes are fully supported.</li>
                    <li>The word count and character count update live in the footer below the output.</li>
                    <li>Everything runs in your browser. Nothing is sent to a server.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
          {html && (
            <div className="shrink-0 border-t border-border bg-card/95 px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
              <span>{input.trim().split(/\s+/).filter(Boolean).length} words in</span>
              <span>{html.length} chars out</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={copy} disabled={!html} aria-label="Copy HTML">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy HTML"}
        </Button>
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={download} disabled={!html} aria-label="Download HTML">
          {downloaded ? <FileCheck className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
