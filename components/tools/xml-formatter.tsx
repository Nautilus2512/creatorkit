"use client"

import { useState } from "react"
import { Copy, Check, Download, Upload, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Mode = "format" | "minify"

function formatXml(xml: string, indent: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "application/xml")
  const err = doc.querySelector("parsererror")
  if (err) throw new Error(err.textContent?.split("\n")[0] || "Invalid XML")

  const serialize = (node: Node, depth: number): string => {
    const pad = indent.repeat(depth)
    if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() || ""
    if (node.nodeType === Node.COMMENT_NODE) return `${pad}<!--${node.textContent}-->`
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      const pi = node as ProcessingInstruction
      return `${pad}<?${pi.target} ${pi.data}?>`
    }
    if (node.nodeType === Node.DOCUMENT_NODE) {
      return Array.from(node.childNodes).map(n => serialize(n, depth)).filter(Boolean).join("\n")
    }
    const el = node as Element
    const attrs = Array.from(el.attributes).map(a => ` ${a.name}="${a.value}"`).join("")
    const children = Array.from(el.childNodes)
    if (children.length === 0) return `${pad}<${el.tagName}${attrs}/>`
    const onlyText = children.length === 1 && children[0].nodeType === Node.TEXT_NODE
    if (onlyText) {
      const text = children[0].textContent?.trim()
      return text ? `${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>` : `${pad}<${el.tagName}${attrs}/>`
    }
    const inner = children.map(n => serialize(n, depth + 1)).filter(Boolean).join("\n")
    return `${pad}<${el.tagName}${attrs}>\n${inner}\n${pad}</${el.tagName}>`
  }

  return serialize(doc, 0)
}

function minifyXml(xml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "application/xml")
  const err = doc.querySelector("parsererror")
  if (err) throw new Error(err.textContent?.split("\n")[0] || "Invalid XML")
  return new XMLSerializer().serializeToString(doc).replace(/>\s+</g, "><").trim()
}

function formatBytes(n: number) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}

const EXAMPLE = `<?xml version="1.0" encoding="UTF-8"?><bookstore><book category="fiction"><title lang="en">The Great Gatsby</title><author>F. Scott Fitzgerald</author><year>1925</year><price>12.99</price></book><book category="web"><title lang="en">Learning XML</title><author>Erik T. Ray</author><year>2003</year><price>39.95</price></book></bookstore>`

export default function XmlFormatter() {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<Mode>("format")
  const [indent, setIndent] = useState("  ")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  let output = ""
  if (input.trim()) {
    try {
      output = mode === "format" ? formatXml(input, indent) : minifyXml(input)
      if (error) setError("")
    } catch (e) {
      if (!error) setError(e instanceof Error ? e.message : "Invalid XML")
    }
  }

  const inputBytes = new TextEncoder().encode(input).length
  const outputBytes = new TextEncoder().encode(output).length
  const savings = mode === "minify" && inputBytes > 0 ? Math.round((1 - outputBytes / inputBytes) * 100) : 0

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const download = () => {
    const blob = new Blob([output], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = mode === "minify" ? "output.min.xml" : "output.xml"
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
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">XML Formatter</h2>
        <p className="text-muted-foreground">Format or minify XML with validation. Runs in your browser.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={mode === "format" ? "default" : "outline"} size="sm" onClick={() => setMode("format")}>
          <Maximize2 className="h-4 w-4 mr-1" />Format
        </Button>
        <Button variant={mode === "minify" ? "default" : "outline"} size="sm" onClick={() => setMode("minify")}>
          <Minimize2 className="h-4 w-4 mr-1" />Minify
        </Button>
        {mode === "format" && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Indent:</span>
            {[{ label: "2 spaces", val: "  " }, { label: "4 spaces", val: "    " }, { label: "Tab", val: "\t" }].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setIndent(val)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${indent === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {label}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Input XML</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setInput(EXAMPLE); setError("") }}>Example</Button>
              <label className="cursor-pointer">
                <input type="file" accept=".xml" className="hidden" onChange={handleFile} />
                <Button variant="ghost" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Upload</span>
                </Button>
              </label>
            </div>
          </div>
          <Textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setError("") }}
            placeholder='<?xml version="1.0"?><root><item>value</item></root>'
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
          />
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{mode === "format" ? "Formatted XML" : "Minified XML"}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={download} disabled={!output}>
                <Download className="h-4 w-4 mr-1" />Download
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex-1 p-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium mb-1">XML Parse Error</p>
                <p className="font-mono text-xs">{error}</p>
              </div>
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
            />
          )}
          {output && !error && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4">
              <span>Input: {formatBytes(inputBytes)}</span>
              <span>Output: {formatBytes(outputBytes)}</span>
              {savings > 0 && <span className="text-green-700">Saved {savings}%</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
