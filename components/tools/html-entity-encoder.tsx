"use client"

import { useState } from "react"
import { Copy, Check, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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

  const output = input ? (mode === "encode" ? encode(input) : decode(input)) : ""

  const switchMode = (newMode: Mode) => { setMode(newMode); setInput("") }

  const swap = () => {
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const insertChar = (value: string) => setInput(prev => prev + value)

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">HTML Entity Encoder / Decoder</h2>
        <p className="text-muted-foreground">Encode special characters to HTML entities or decode them back</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={mode === "encode" ? "default" : "outline"} size="sm" onClick={() => switchMode("encode")}>Encode</Button>
        <Button variant={mode === "decode" ? "default" : "outline"} size="sm" onClick={() => switchMode("decode")}>Decode</Button>
        <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
          <ArrowLeftRight className="h-4 w-4 mr-1" />Swap
        </Button>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Quick insert:</span>
        <div className="flex flex-wrap gap-1">
          {REFERENCE.map(({ char, entity }) => (
            <button
              key={entity}
              onClick={() => insertChar(mode === "encode" ? char : entity)}
              title={`Insert ${mode === "encode" ? char : entity}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-background hover:border-primary/50 transition-colors text-xs font-mono whitespace-nowrap"
            >
              <span className="text-muted-foreground">{char === " " ? "⎵" : char}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{entity}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">{mode === "encode" ? "Plain Text / HTML" : "Encoded HTML"}</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? 'e.g. <div class="hello">World & Friends</div>' : "e.g. &lt;div&gt;Hello &amp; World&lt;/div&gt;"}
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono p-4"
          />
        </div>

        {/* Right */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{mode === "encode" ? "Encoded Output" : "Decoded Text"}</span>
            <div className="flex items-center gap-2">
              {(input || output) && (
                <span className="text-xs text-muted-foreground">{input.length} → {output.length} chars</span>
              )}
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <Textarea
            value={output}
            readOnly
            placeholder="Output will appear here..."
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10 p-4"
          />
        </div>
      </div>
    </div>
  )
}
