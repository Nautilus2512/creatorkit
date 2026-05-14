"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Copy, Check, ArrowLeftRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

type Mode = "encode" | "decode"

function encode(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function decode(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&copy;/gi, "©")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™")
    .replace(/&euro;/gi, "€")
    .replace(/&pound;/gi, "£")
    .replace(/&yen;/gi, "¥")
    .replace(/&hellip;/gi, "…")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&rarr;/gi, "→")
    .replace(/&larr;/gi, "←")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/gi, (_, d) => String.fromCharCode(parseInt(d, 10)))
}

const REFERENCE = [
  { char: "&", entity: "&amp;" },
  { char: "<", entity: "&lt;" },
  { char: ">", entity: "&gt;" },
  { char: '"', entity: "&quot;" },
  { char: "'", entity: "&#39;" },
  { char: "©", entity: "&copy;" },
  { char: "®", entity: "&reg;" },
  { char: "™", entity: "&trade;" },
  { char: "€", entity: "&euro;" },
  { char: "£", entity: "&pound;" },
  { char: "…", entity: "&hellip;" },
  { char: "—", entity: "&mdash;" },
  { char: "→", entity: "&rarr;" },
  { char: " ", entity: "&nbsp;" },
]

const shortcuts = [
  { keys: ["Ctrl", "Shift", "E"], description: "Encode mode" },
  { keys: ["Ctrl", "Shift", "D"], description: "Decode mode" },
  { keys: ["Ctrl", "Shift", "S"], description: "Swap input/output" },
  { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
  { keys: ["?"], description: "Toggle this panel" },
]

export default function HtmlEntityEncoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const output = input ? (mode === "encode" ? encode(input) : decode(input)) : ""

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode)
    setInput("")
    announceToScreenReader(`${newMode === "encode" ? "Encode" : "Decode"} mode selected`)
  }, [])

  const swap = useCallback(() => {
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
    announceToScreenReader(`Swapped to ${newMode} mode`)
  }, [mode, output])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader("Copied to clipboard")
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [output])

  const download = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = mode === "encode" ? "encoded.html" : "decoded.txt"
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("Output downloaded")
  }, [output, mode])

  const insertChar = useCallback((value: string) => {
    setInput(prev => prev + value)
    announceToScreenReader(`Inserted ${value}`)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); switchMode("encode") }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); switchMode("decode") }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); swap() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") { e.preventDefault(); if (output) copy() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [switchMode, swap, copy, output])

  useEffect(() => {
    return () => { if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current) }
  }, [])

  return (
    <>
      <div className="flex flex-1 flex-col min-h-0">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="HTML Entity Encoder controls">
          <span className="text-sm font-semibold shrink-0 mr-1">HTML Entity Encoder</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          {/* Mode toggles */}
          <div className="flex items-center gap-1" role="group" aria-label="Mode selection">
            <Button
              variant={mode === "encode" ? "default" : "outline"}
              size="sm"
              onClick={() => switchMode("encode")}
              aria-pressed={mode === "encode"}
              aria-label="Encode mode, press Ctrl+Shift+E"
            >
              Encode
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
            </Button>
            <Button
              variant={mode === "decode" ? "default" : "outline"}
              size="sm"
              onClick={() => switchMode("decode")}
              aria-pressed={mode === "decode"}
              aria-label="Decode mode, press Ctrl+Shift+D"
            >
              Decode
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={swap}
              disabled={!output}
              aria-label="Swap input and output, press Ctrl+Shift+S"
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <span className="text-xs text-muted-foreground" id="quick-insert-label-desktop">Quick insert:</span>
          <div className="flex flex-wrap gap-1" role="group" aria-labelledby="quick-insert-label-desktop">
            {REFERENCE.map(({ char, entity }) => (
              <button
                key={entity}
                onClick={() => insertChar(mode === "encode" ? char : entity)}
                title={`Insert ${mode === "encode" ? char : entity}`}
                aria-label={`Insert ${mode === "encode" ? char : entity}`}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-background hover:border-primary/50 transition-colors text-xs font-mono whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="text-muted-foreground" aria-hidden="true">{char === " " ? "⎵" : char}</span>
                <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                <span aria-hidden="true">{entity}</span>
              </button>
            ))}
          </div>
          {(input || output) && (
            <span className="text-xs text-muted-foreground ml-1" aria-live="polite">{input.length} → {output.length} chars</span>
          )}

          {/* RIGHT: primary output actions + ShortcutsModal */}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="HTML Entity Encoder" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button size="sm" onClick={download} disabled={!output} aria-label="Download output">
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">HTML Entity Encoder</h2>
            <ShortcutsModal pageName="HTML Entity Encoder" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              {mode === "encode" ? "Plain Text" : "Encoded HTML"}
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              {mode === "encode" ? "Encoded" : "Decoded"}
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Input">
            <div className="flex-1 overflow-y-auto">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "encode" ? 'e.g. <div class="hello">World & Friends</div>' : "e.g. &lt;div&gt;Hello &amp; World&lt;/div&gt;"}
                className="h-full resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono p-4"
                aria-label={`${mode === "encode" ? "Plain text input" : "Encoded HTML input"}`}
              />
            </div>
          </div>

          {/* Output panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Output">
            <div className="flex-1 overflow-y-auto">
              <Textarea
                value={output}
                readOnly
                placeholder="Output will appear here..."
                className="h-full resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10 p-4"
                aria-label={`${mode === "encode" ? "Encoded output" : "Decoded text output"}`}
              />
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <Button
            variant={mode === "encode" ? "default" : "outline"}
            size="sm"
            className="h-11 px-3"
            onClick={() => switchMode("encode")}
            aria-pressed={mode === "encode"}
          >
            <span className="text-xs">Encode</span>
          </Button>
          <Button
            variant={mode === "decode" ? "default" : "outline"}
            size="sm"
            className="h-11 px-3"
            onClick={() => switchMode("decode")}
            aria-pressed={mode === "decode"}
          >
            <span className="text-xs">Decode</span>
          </Button>
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={swap} disabled={!output}>
            <ArrowLeftRight className="h-4 w-4" />
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
