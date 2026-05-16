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
  { keys: ["Ctrl", "Shift", "L"], description: "Decode mode" },
  { keys: ["Ctrl", "Shift", "S"], description: "Swap input/output" },
  { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
  { keys: ["?"], description: "Toggle this panel" },
]

export default function HtmlEntityEncoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downloadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (!output) return
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
    setDownloading(true)
    announceToScreenReader("Download started.")
    if (downloadingTimeoutRef.current) clearTimeout(downloadingTimeoutRef.current)
    downloadingTimeoutRef.current = setTimeout(() => setDownloading(false), 1500)
  }, [output, mode])

  const insertChar = useCallback((value: string) => {
    setInput(prev => prev + value)
    announceToScreenReader(`Inserted ${value}`)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); switchMode("encode") }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); switchMode("decode") }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); swap() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") { e.preventDefault(); if (output) copy() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [switchMode, swap, copy, output])

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      if (downloadingTimeoutRef.current) clearTimeout(downloadingTimeoutRef.current)
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="HTML Entity Encoder controls">
        <span className="text-sm font-semibold shrink-0 mr-1">HTML Entity Encoder</span>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1" role="group" aria-label="Mode selection">
          <Button
            variant={mode === "encode" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("encode")}
            aria-pressed={mode === "encode"}
            aria-label="Encode mode, press Ctrl+Shift+E"
          >
            Encode
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${mode === "encode" ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+E</kbd>
          </Button>
          <Button
            variant={mode === "decode" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("decode")}
            aria-pressed={mode === "decode"}
            aria-label="Decode mode, press Ctrl+Shift+L"
          >
            Decode
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${mode === "decode" ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+L</kbd>
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
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="HTML Entity Encoder" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}>
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
          <Button variant={downloading ? "outline" : "default"} size="sm" onClick={download} disabled={!output} aria-label="Download output">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">HTML Entity Encoder</h2>
          <ShortcutsModal pageName="HTML Entity Encoder" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {mode === "encode" ? "Plain Text" : "Encoded HTML"}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {mode === "encode" ? "Encoded" : "Decoded"}
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">

        {/* PANELS CARD */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Input panel */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 border-b md:border-b-0 md:border-r border-border`}
            role="region"
            aria-label="Input"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "encode" ? 'e.g. <div class="hello">World & Friends</div>' : "e.g. &lt;div&gt;Hello &amp; World&lt;/div&gt;"}
              className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono p-4"
              aria-label={mode === "encode" ? "Plain text input" : "Encoded HTML input"}
            />
          </div>

          {/* Output panel */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0`}
            role="region"
            aria-label="Output"
          >
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10 p-4"
              aria-label={mode === "encode" ? "Encoded output" : "Decoded text output"}
            />
          </div>

        </div>

        {/* USAGE GUIDE */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose <span className="text-foreground font-medium">Encode</span> to convert plain text or HTML into safe HTML entities,
              or <span className="text-foreground font-medium">Decode</span> to convert entities back into readable characters.
              Type or paste your text into the input panel. The result appears instantly in the output panel.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Quick insert</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use the <span className="text-foreground font-medium">Quick insert</span> buttons in the toolbar to add common characters or entities directly into the input.
              In Encode mode they insert the raw character. In Decode mode they insert the entity string.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Swap</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The <span className="text-foreground font-medium">Swap</span> button copies the current output into the input and switches modes.
              Use it to round-trip a value. Encode some HTML, then swap to verify the decoded result matches the original.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+E</kbd> Switch to Encode mode</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd> Switch to Decode mode</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd> Swap input and output</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> Copy output</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Show all shortcuts</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />

      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
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
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={swap} disabled={!output} aria-label="Swap input and output">
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy output"}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
        </Button>
        <Button variant={downloading ? "outline" : "default"} size="sm" className="h-11 px-3" onClick={download} disabled={!output} aria-label="Download output">
          <Download className="h-4 w-4" aria-hidden="true" /><span className="ml-1 text-xs">Save</span>
        </Button>
      </div>

    </div>
  )
}
