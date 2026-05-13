"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Download, Upload, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

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

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [output, announceToScreenReader])

  const download = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = mode === "minify" ? "output.min.xml" : "output.xml"
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("XML downloaded")
  }, [output, mode, announceToScreenReader])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(reader.result as string)
      announceToScreenReader(`File loaded: ${file.name}`)
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [announceToScreenReader])

  const changeMode = useCallback((newMode: Mode) => {
    setMode(newMode)
    announceToScreenReader(`Switched to ${newMode} mode`)
  }, [announceToScreenReader])

  const changeIndent = useCallback((newIndent: string) => {
    setIndent(newIndent)
    announceToScreenReader(`Indent changed to ${newIndent === "  " ? "2 spaces" : newIndent === "    " ? "4 spaces" : "tab"}`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            if (output) {
              e.preventDefault()
              copy()
            }
            break
          case "d":
            if (output) {
              e.preventDefault()
              download()
            }
            break
          case "f":
            e.preventDefault()
            changeMode("format")
            break
          case "m":
            e.preventDefault()
            changeMode("minify")
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [output, copy, download, changeMode])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download XML" },
    { keys: ["Ctrl", "Shift", "F"], description: "Switch to format mode" },
    { keys: ["Ctrl", "Shift", "M"], description: "Switch to minify mode" },
  ]

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">XML Formatter</h2>
          <p className="text-muted-foreground">Format or minify XML with validation. Runs in your browser.</p>
        </div>
        <ShortcutsModal pageName="XML Formatter" shortcuts={shortcuts} />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="XML formatting options">
        <Button 
          variant={mode === "format" ? "default" : "outline"} 
          size="sm" 
          onClick={() => changeMode("format")}
          aria-pressed={mode === "format"}
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Maximize2 className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Format</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>F</span>
          </kbd>
        </Button>
        <Button 
          variant={mode === "minify" ? "default" : "outline"} 
          size="sm" 
          onClick={() => changeMode("minify")}
          aria-pressed={mode === "minify"}
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Minimize2 className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Minify</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>M</span>
          </kbd>
        </Button>
        {mode === "format" && (
          <>
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <span className="text-xs text-muted-foreground" id="indent-label">Indent:</span>
            {[{ label: "2 spaces", val: "  " }, { label: "4 spaces", val: "    " }, { label: "Tab", val: "\t" }].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => changeIndent(val)}
                role="radio"
                aria-checked={indent === val}
                aria-labelledby="indent-label"
                className={`text-xs px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${indent === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {label}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Input XML panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="input-label">Input XML</span>
            <div className="flex gap-1" role="group" aria-label="Input actions">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setInput(EXAMPLE); setError(""); announceToScreenReader("Example XML loaded") }}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Load example XML"
              >
                Example
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".xml" className="hidden" onChange={handleFile} aria-label="Upload XML file" />
                <Button variant="ghost" size="sm" asChild className="focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <span><Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload</span>
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
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Output XML panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "format" ? "Formatted XML" : "Minified XML"}</span>
            <div className="flex gap-1" role="group" aria-label="Output actions">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copy} 
                disabled={!output}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}
              >
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                  <span>Ctrl</span><span>Shift</span><span>C</span>
                </kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={download} 
                disabled={!output}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Download XML file"
              >
                <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                <span>Download</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                  <span>Ctrl</span><span>Shift</span><span>D</span>
                </kbd>
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex-1 p-4" role="alert" aria-live="assertive">
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
              aria-labelledby="output-label"
            />
          )}
          {output && !error && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
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
