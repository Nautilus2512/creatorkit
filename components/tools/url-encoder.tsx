"use client"

import { useState } from "react"
import { Copy, Check, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Mode = "encode" | "decode"
type EncodeMode = "component" | "full"

export default function UrlEncoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [encodeMode, setEncodeMode] = useState<EncodeMode>("component")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const process = (text: string, currentMode: Mode, currentEncodeMode: EncodeMode) => {
    setError("")
    if (!text) { setOutput(""); return }
    try {
      if (currentMode === "encode") {
        setOutput(currentEncodeMode === "component" ? encodeURIComponent(text) : encodeURI(text))
      } else {
        setOutput(decodeURIComponent(text))
      }
    } catch {
      setError("Invalid URL encoding — check your input")
      setOutput("")
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    process(value, mode, encodeMode)
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setInput("")
    setOutput("")
    setError("")
  }

  const switchEncodeMode = (newEncodeMode: EncodeMode) => {
    setEncodeMode(newEncodeMode)
    process(input, mode, newEncodeMode)
  }

  const swap = () => {
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
    process(output, newMode, encodeMode)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">URL Encoder / Decoder</h2>
        <p className="text-muted-foreground">Encode or decode URL components and full URLs</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={mode === "encode" ? "default" : "outline"} size="sm" onClick={() => switchMode("encode")}>Encode</Button>
        <Button variant={mode === "decode" ? "default" : "outline"} size="sm" onClick={() => switchMode("decode")}>Decode</Button>
        <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
          <ArrowLeftRight className="h-4 w-4 mr-1" />Swap
        </Button>
        {mode === "encode" && (
          <>
            <div className="w-px h-4 bg-border" />
            {([
              { key: "component", label: "encodeURIComponent", hint: "Encodes all special chars (for query params)" },
              { key: "full", label: "encodeURI", hint: "Preserves URL structure (for full URLs)" },
            ] as { key: EncodeMode; label: string; hint: string }[]).map(({ key, label, hint }) => (
              <button
                key={key}
                onClick={() => switchEncodeMode(key)}
                title={hint}
                className={`text-xs px-3 py-1 rounded-full border transition-colors font-mono ${encodeMode === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {label}
              </button>
            ))}
          </>
        )}
        {(input || output) && (
          <span className="ml-auto text-xs text-muted-foreground">{input.length} → {output.length} chars</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">{mode === "encode" ? "Original Text / URL" : "Encoded URL"}</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === "encode" ? "Enter text or URL to encode..." : "Paste encoded URL to decode..."}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
          />
        </div>

        {/* Right Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{mode === "encode" ? "Encoded Output" : "Decoded Text"}</span>
            <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-sm p-6">{error}</div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
            />
          )}
        </div>
      </div>
    </div>
  )
}
