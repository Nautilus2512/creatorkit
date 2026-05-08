"use client"

import { useState } from "react"
import { Copy, Check, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

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

export default function CssMinifier() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)

  const output = input.trim() ? minifyCss(input) : ""
  const inputBytes = new TextEncoder().encode(input).length
  const outputBytes = new TextEncoder().encode(output).length
  const savings = inputBytes > 0 ? Math.round((1 - outputBytes / inputBytes) * 100) : 0

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const download = () => {
    const blob = new Blob([output], { type: "text/css" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "styles.min.css"
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
          <h2 className="text-2xl font-semibold tracking-tight">CSS Minifier</h2>
          <p className="text-muted-foreground">Remove whitespace and comments from CSS. Runs entirely in your browser.</p>
        </div>
        {savings > 0 && (
          <Badge variant="secondary" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-300">
            -{savings}% smaller
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Original CSS</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setInput(EXAMPLE)}>Load Example</Button>
              <label className="cursor-pointer">
                <input type="file" accept=".css" className="hidden" onChange={handleFile} />
                <Button variant="ghost" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Upload</span>
                </Button>
              </label>
            </div>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder=".container {\n  display: flex;\n  /* my comment */\n  padding: 16px;\n}"
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
          />
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Minified CSS</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={download} disabled={!output}>
                <Download className="h-4 w-4 mr-1" />.min.css
              </Button>
            </div>
          </div>
          <Textarea
            value={output}
            readOnly
            placeholder="Minified CSS will appear here..."
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
          />
          {output && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4">
              <span>Original: {formatBytes(inputBytes)}</span>
              <span>Minified: {formatBytes(outputBytes)}</span>
              {savings > 0 && <span className="text-green-700">Saved {formatBytes(inputBytes - outputBytes)} ({savings}%)</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
