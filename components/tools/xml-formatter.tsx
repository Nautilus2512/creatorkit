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

const shortcuts = [
  { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
  { keys: ["Ctrl", "Shift", "D"], description: "Download XML" },
  { keys: ["Ctrl", "Shift", "F"], description: "Switch to format mode" },
  { keys: ["Ctrl", "Shift", "M"], description: "Switch to minify mode" },
]

export default function XmlFormatter() {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<Mode>("format")
  const [indent, setIndent] = useState("  ")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

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
      setError("")
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

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-1 flex-col min-h-0">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="XML Formatter controls">
          <span className="text-sm font-semibold shrink-0 mr-1">XML Formatter</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          {/* Mode toggles */}
          <div className="flex items-center gap-1" role="group" aria-label="XML formatting options">
            <Button
              variant={mode === "format" ? "default" : "outline"}
              size="sm"
              onClick={() => changeMode("format")}
              aria-pressed={mode === "format"}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Maximize2 className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Format</span>
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+F</kbd>
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
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+M</kbd>
            </Button>
          </div>
          {mode === "format" && (
            <>
              <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
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
          {output && !error && (
            <span className="text-xs text-muted-foreground">
              {formatBytes(inputBytes)} → {formatBytes(outputBytes)}{savings > 0 && <span className="text-green-700 ml-1">(-{savings}%)</span>}
            </span>
          )}

          {/* RIGHT: primary output actions + ShortcutsModal */}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="XML Formatter" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button size="sm" onClick={download} disabled={!output} aria-label="Download XML file">
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Download</span>
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">XML Formatter</h2>
            <ShortcutsModal pageName="XML Formatter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              XML Input
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Output
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Input XML panel">
            <div className="flex-1 overflow-y-auto">
              <Textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setError("") }}
                placeholder='<?xml version="1.0"?><root><item>value</item></root>'
                className="h-full resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
              />
            </div>
          </div>

          {/* Output panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Output XML panel">
            <div className="flex-1 overflow-y-auto flex flex-col">
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
                  aria-label={mode === "format" ? "Formatted XML" : "Minified XML"}
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

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <Button
            variant={mode === "format" ? "default" : "outline"}
            size="sm"
            className="h-11 px-3"
            onClick={() => changeMode("format")}
            aria-pressed={mode === "format"}
          >
            <Maximize2 className="h-4 w-4" /><span className="ml-1 text-xs">Format</span>
          </Button>
          <Button
            variant={mode === "minify" ? "default" : "outline"}
            size="sm"
            className="h-11 px-3"
            onClick={() => changeMode("minify")}
            aria-pressed={mode === "minify"}
          >
            <Minimize2 className="h-4 w-4" /><span className="ml-1 text-xs">Minify</span>
          </Button>
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
