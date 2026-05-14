"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Accessibility helper for screen reader announcements
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*([{}:;,>~+|])\s*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*\n\s*/g, "")
    .replace(/;}/g, "}")
    .replace(/^\s+|\s+$/g, "")
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

const EXAMPLE = `.container {
  display: flex;
  /* Center the items */
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  margin: 0 auto;
  max-width: 1200px;
}

.button {
  background-color: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}`

const shortcuts = [
  { keys: ["Ctrl", "O"], description: "Upload CSS file" },
  { keys: ["Ctrl", "E"], description: "Load example CSS" },
  { keys: ["Ctrl", "Shift", "C"], description: "Copy minified output" },
  { keys: ["Ctrl", "Shift", "D"], description: "Download as .min.css" },
  { keys: ["Escape"], description: "Focus CSS input" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between controls" },
]

export default function CssMinifier() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const output = input.trim() ? minifyCss(input) : ""
  const inputBytes = new TextEncoder().encode(input).length
  const outputBytes = new TextEncoder().encode(output).length
  const savings = inputBytes > 0 ? Math.round((1 - outputBytes / inputBytes) * 100) : 0

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader(`Copied ${formatBytes(outputBytes)} to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }, [output, outputBytes])

  const download = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "text/css" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "styles.min.css"
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader(`Downloaded styles.min.css (${formatBytes(outputBytes)})`)
  }, [output, outputBytes])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      announceToScreenReader('No file selected')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setInput(content)
      const bytes = new TextEncoder().encode(content).length
      announceToScreenReader(`Uploaded ${file.name} (${formatBytes(bytes)})`)
      setActiveTab("output")
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  const loadExample = useCallback(() => {
    setInput(EXAMPLE)
    const bytes = new TextEncoder().encode(EXAMPLE).length
    announceToScreenReader(`Example loaded (${formatBytes(bytes)})`)
  }, [])

  const clearInput = useCallback(() => {
    setInput('')
    announceToScreenReader('Input cleared')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+O to upload
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        e.stopPropagation()
        const fileInput = document.getElementById('css-upload') as HTMLInputElement
        fileInput?.click()
      }

      // Ctrl+Shift+C to copy output
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault()
        e.stopPropagation()
        copy()
      }

      // Ctrl+Shift+D to download
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
        e.stopPropagation()
        download()
      }

      // Ctrl+Shift+E to load example
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        e.stopPropagation()
        loadExample()
      }

      // Escape to focus input
      if (e.key === "Escape") {
        const textarea = document.getElementById('css-input') as HTMLTextAreaElement
        textarea?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [copy, download, loadExample])

  return (
    <>
      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="CSS Minifier controls">
          <span className="text-sm font-semibold shrink-0 mr-1">CSS Minifier</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <Button
            variant="ghost"
            size="sm"
            onClick={loadExample}
            aria-label="Load example CSS"
          >
            Load Example
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
          </Button>
          <>
            <input
              type="file"
              id="css-upload"
              accept=".css"
              className="hidden"
              onChange={handleFile}
              aria-label="Upload CSS file"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const fileInput = document.getElementById('css-upload') as HTMLInputElement
                fileInput?.click()
              }}
              aria-label="Upload CSS file"
            >
              <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+O</kbd>
            </Button>
          </>
          {input && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearInput}
              aria-label="Clear input"
            >
              Clear
            </Button>
          )}
          {savings > 0 && (
            <Badge
              variant="secondary"
              className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-300"
              role="status"
              aria-live="polite"
              aria-label={`Minified output is ${savings}% smaller`}
            >
              -{savings}% smaller
            </Badge>
          )}

          {/* RIGHT: primary output actions + ShortcutsModal */}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="CSS Minifier" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy minified CSS"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button size="sm" onClick={download} disabled={!output} aria-label="Download minified CSS as file">
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">CSS Minifier</h2>
            <ShortcutsModal pageName="CSS Minifier" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              CSS Input
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Minified Output
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="CSS Input">
            <div className="flex-1 overflow-y-auto">
              <Textarea
                id="css-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=".container {
  display: flex;
  /* my comment */
  padding: 16px;
}"
                className="h-full resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
                aria-label="Original CSS input"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Output panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Minified Output">
            <div className="flex-1 overflow-y-auto flex flex-col">
              <Textarea
                id="css-output"
                value={output}
                readOnly
                placeholder="Minified CSS will appear here..."
                className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
                aria-label="Minified CSS output"
                aria-live="polite"
                aria-atomic="true"
              />
              {output && (
                <div
                  className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4"
                  role="status"
                  aria-label={`File size statistics: Original ${formatBytes(inputBytes)}, Minified ${formatBytes(outputBytes)}, Saved ${formatBytes(inputBytes - outputBytes)} (${savings}%)`}
                >
                  <span>Original: {formatBytes(inputBytes)}</span>
                  <span>Minified: {formatBytes(outputBytes)}</span>
                  {savings > 0 && <span className="text-green-700">Saved {formatBytes(inputBytes - outputBytes)} ({savings}%)</span>}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <Button variant="ghost" size="sm" className="h-11 px-3" onClick={loadExample}>
            <span className="text-xs">Example</span>
          </Button>
          <>
            <input
              type="file"
              id="css-upload-mobile"
              accept=".css"
              className="hidden"
              onChange={handleFile}
              aria-label="Upload CSS file"
            />
            <Button variant="ghost" size="sm" className="h-11 px-3" onClick={() => {
              const fileInput = document.getElementById('css-upload-mobile') as HTMLInputElement
              fileInput?.click()
            }}>
              <Upload className="h-4 w-4" /><span className="ml-1 text-xs">Upload</span>
            </Button>
          </>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={copy} disabled={!output}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button size="sm" className="h-11 px-3" onClick={download} disabled={!output}>
            <Download className="h-4 w-4" /><span className="ml-1 text-xs">Save</span>
          </Button>
        </div>

      </div>
    </>
  )
}
