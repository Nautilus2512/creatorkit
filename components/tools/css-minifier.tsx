"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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
  { keys: ["Ctrl", "Shift", "U"], description: "Upload CSS file" },
  { keys: ["Ctrl", "Shift", "E"], description: "Load example CSS" },
  { keys: ["Ctrl", "Shift", "V"], description: "Copy minified output" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download as .min.css" },
  { keys: ["Escape"], description: "Focus CSS input" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between controls" },
]

export default function CssMinifier() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
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
    setDownloading(true)
    announceToScreenReader(`Downloaded styles.min.css (${formatBytes(outputBytes)})`)
    setTimeout(() => setDownloading(false), 1500)
  }, [output, outputBytes])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      announceToScreenReader("No file selected")
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
    announceToScreenReader("Example loaded")
  }, [])

  const clearInput = useCallback(() => {
    setInput("")
    announceToScreenReader("Input cleared")
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        const fileInput = document.getElementById("css-upload") as HTMLInputElement
        fileInput?.click()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        loadExample()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault()
        copy()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        download()
      }

      if (e.key === "Escape") {
        const textarea = document.getElementById("css-input") as HTMLTextAreaElement
        textarea?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [copy, download, loadExample])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="CSS Minifier controls">
        <span className="text-sm font-semibold shrink-0 mr-1">CSS Minifier</span>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <Button variant="ghost" size="sm" onClick={loadExample} aria-label="Load example CSS">
          Load Example
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
        </Button>
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
          onClick={() => (document.getElementById("css-upload") as HTMLInputElement)?.click()}
          aria-label="Upload CSS file"
        >
          <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
        </Button>
        {input && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearInput}
            aria-label="Clear input"
            className="text-muted-foreground hover:text-destructive"
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

        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="CSS Minifier" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy minified CSS"}>
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
          <Button
            variant={downloading ? "outline" : "default"}
            size="sm"
            onClick={download}
            disabled={!output}
            aria-label="Download minified CSS as file"
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
            <kbd
              className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
                downloading
                  ? "border-border bg-muted"
                  : "border-primary-foreground/30 bg-primary-foreground/20"
              }`}
              aria-hidden="true"
            >
              Ctrl+Shift+S
            </kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">CSS Minifier</h2>
          <ShortcutsModal pageName="CSS Minifier" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            CSS Input
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Minified Output
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* PANELS CARD */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Input panel */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden md:border-r border-border`}
            role="region"
            aria-label="CSS Input"
          >
            <Textarea
              id="css-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`.container {\n  display: flex;\n  /* my comment */\n  padding: 16px;\n}`}
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
              aria-label="Original CSS input"
              spellCheck={false}
            />
          </div>

          {/* Output panel */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region"
            aria-label="Minified Output"
          >
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
                aria-label={`File size: original ${formatBytes(inputBytes)}, minified ${formatBytes(outputBytes)}, saved ${formatBytes(inputBytes - outputBytes)} (${savings}%)`}
              >
                <span>Original: {formatBytes(inputBytes)}</span>
                <span>Minified: {formatBytes(outputBytes)}</span>
                {savings > 0 && <span className="text-green-700 dark:text-green-400">Saved {formatBytes(inputBytes - outputBytes)} ({savings}%)</span>}
              </div>
            )}
          </div>

        </div>

        {/* USAGE GUIDE */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Paste your CSS into the <span className="text-foreground font-medium">CSS Input</span> panel, or click <span className="text-foreground font-medium">Upload</span> to load a .css file from your device.</li>
              <li>The <span className="text-foreground font-medium">Minified Output</span> panel updates instantly. The stats bar at the bottom shows original size, minified size, and bytes saved.</li>
              <li>Click <span className="text-foreground font-medium">Copy</span> to copy the result to your clipboard, or <span className="text-foreground font-medium">Download</span> to save it as <span className="text-foreground font-medium">styles.min.css</span>.</li>
              <li>Not sure what to paste? Click <span className="text-foreground font-medium">Load Example</span> to see the tool in action with sample CSS.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> opens the file picker to upload a .css file.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+E</kbd> loads the built-in example CSS.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copies the minified output to your clipboard.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd> downloads the result as a .min.css file.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Escape</kbd> moves focus to the CSS input so you can type or paste immediately.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">What gets minified</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>All <span className="text-foreground font-medium">comments</span> are removed.</li>
              <li>Unnecessary <span className="text-foreground font-medium">whitespace</span> around selectors, brackets, colons, semicolons, and commas is stripped.</li>
              <li>Redundant <span className="text-foreground font-medium">trailing semicolons</span> before closing braces are removed.</li>
              <li>Multiple blank lines and line breaks are collapsed into a single continuous string.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
        </div>

        {/* Spacer so fixed mobile bar does not cover last content */}
        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button variant="ghost" size="sm" className="h-11 px-3" onClick={loadExample} aria-label="Load example CSS">
          <span className="text-xs">Example</span>
        </Button>
        <input
          type="file"
          id="css-upload-mobile"
          accept=".css"
          className="hidden"
          onChange={handleFile}
          aria-label="Upload CSS file"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-11 px-3"
          onClick={() => (document.getElementById("css-upload-mobile") as HTMLInputElement)?.click()}
          aria-label="Upload CSS file"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1 text-xs">Upload</span>
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy minified CSS"}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
        </Button>
        <Button size="sm" className="h-11 px-3" onClick={download} disabled={!output} aria-label="Download minified CSS as file">
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1 text-xs">Save</span>
        </Button>
      </div>

    </div>
  )
}
