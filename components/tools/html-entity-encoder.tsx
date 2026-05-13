"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Copy, Check, ArrowLeftRight } from "lucide-react"
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

export default function HtmlEntityEncoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const output = input ? (mode === "encode" ? encode(input) : decode(input)) : ""

  const switchMode = useCallback((newMode: Mode) => { 
    setMode(newMode); 
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
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">HTML Entity Encoder / Decoder</h2>
        <p className="text-muted-foreground">Encode special characters to HTML entities or decode them back. Press ? for shortcuts.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mode selection">
        <Button 
          variant={mode === "encode" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("encode")}
          aria-pressed={mode === "encode"}
          aria-label="Encode mode, press Ctrl+Shift+E"
        >Encode <kbd className="ml-2 rounded border border-current/20 bg-current/10 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd></Button>
        <Button 
          variant={mode === "decode" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("decode")}
          aria-pressed={mode === "decode"}
          aria-label="Decode mode, press Ctrl+Shift+D"
        >Decode <kbd className="ml-2 rounded border border-current/20 bg-current/10 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd></Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={swap} 
          disabled={!output}
          aria-label="Swap input and output, press Ctrl+Shift+S"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap <kbd className="ml-2 rounded border border-current/20 bg-current/10 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
        </Button>
        <div className="h-4 w-px bg-border" aria-hidden="true" />
        <span className="text-xs text-muted-foreground" id="quick-insert-label">Quick insert:</span>
        <div className="flex flex-wrap gap-1" role="group" aria-labelledby="quick-insert-label">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-labelledby="input-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="input-label">{mode === "encode" ? "Plain Text / HTML" : "Encoded HTML"}</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? 'e.g. <div class="hello">World & Friends</div>' : "e.g. &lt;div&gt;Hello &amp; World&lt;/div&gt;"}
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono p-4"
            aria-label={`${mode === "encode" ? "Plain text input" : "Encoded HTML input"}`}
          />
        </div>

        {/* Right */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-labelledby="output-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "encode" ? "Encoded Output" : "Decoded Text"}</span>
            <div className="flex items-center gap-2">
              {(input || output) && (
                <span className="text-xs text-muted-foreground" aria-live="polite">{input.length} → {output.length} chars</span>
              )}
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}>
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}
                {!copied && output && <kbd className="ml-2 rounded border border-current/20 bg-current/10 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>}
              </Button>
            </div>
          </div>
          <Textarea
            value={output}
            readOnly
            placeholder="Output will appear here..."
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10 p-4"
            aria-label={`${mode === "encode" ? "Encoded output" : "Decoded text output"}`}
          />
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="HTML Entity Encoder"
      shortcuts={[
        { keys: ["Ctrl", "Shift", "E"], description: "Encode mode" },
        { keys: ["Ctrl", "Shift", "D"], description: "Decode mode" },
        { keys: ["Ctrl", "Shift", "S"], description: "Swap input/output" },
        { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    </>
  )
}
