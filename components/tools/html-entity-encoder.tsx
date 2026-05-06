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
    .replace(/&nbsp;/gi, " ")
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

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setInput("")
  }

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

  const insertChar = (value: string) => {
    setInput(prev => prev + value)
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">HTML Entity Encoder / Decoder</h1>
            <p className="text-sm text-muted-foreground">Encode special characters to HTML entities or decode them back</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={mode === "encode" ? "default" : "outline"} size="sm" onClick={() => switchMode("encode")}>Encode</Button>
            <Button variant={mode === "decode" ? "default" : "outline"} size="sm" onClick={() => switchMode("decode")}>Decode</Button>
            <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Swap
            </Button>
          </div>
        </div>
      </div>

      {/* Quick-insert reference */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <span className="text-xs text-muted-foreground self-center mr-1">Insert:</span>
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

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "encode" ? "Plain Text / HTML" : "Encoded HTML"}</h3>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? 'e.g. <div class="hello">World & Friends</div>' : "e.g. &lt;div&gt;Hello &amp; World&lt;/div&gt;"}
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono"
          />
        </div>

        {/* Right */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "encode" ? "Encoded Output" : "Decoded Text"}</h3>
            <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            placeholder="Output will appear here..."
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10"
          />
        </div>
      </div>

      {/* Status */}
      {(input || output) && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
          <span>Input: {input.length} chars</span>
          {output && <span>Output: {output.length} chars</span>}
          {mode === "encode" && output && output.length !== input.length && (
            <span>+{output.length - input.length} encoded chars</span>
          )}
        </div>
      )}
    </div>
  )
}
