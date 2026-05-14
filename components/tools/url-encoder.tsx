"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Mode = "encode" | "decode"
type EncodeMode = "component" | "full"

export default function UrlEncoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [encodeMode, setEncodeMode] = useState<EncodeMode>("component")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const process = useCallback((text: string, currentMode: Mode, currentEncodeMode: EncodeMode) => {
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
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    process(value, mode, encodeMode)
    if (value) announceToScreenReader(`${mode === "encode" ? "Encoding" : "Decoding"} text`)
  }, [mode, encodeMode, process, announceToScreenReader])

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode)
    setInput("")
    setOutput("")
    setError("")
    announceToScreenReader(`Switched to ${newMode} mode`)
  }, [announceToScreenReader])

  const switchEncodeMode = useCallback((newEncodeMode: EncodeMode) => {
    setEncodeMode(newEncodeMode)
    process(input, mode, newEncodeMode)
    announceToScreenReader(`Switched to ${newEncodeMode} encoding`)
  }, [input, mode, process, announceToScreenReader])

  const swap = useCallback(() => {
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
    process(output, newMode, encodeMode)
    announceToScreenReader(`Swapped to ${newMode} mode with output`)
  }, [mode, output, encodeMode, process, announceToScreenReader])

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader("Output copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [output, announceToScreenReader])

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
          case "s":
            if (output) {
              e.preventDefault()
              swap()
            }
            break
          case "e":
            e.preventDefault()
            switchMode("encode")
            break
          case "d":
            e.preventDefault()
            switchMode("decode")
            break
          case "1":
            if (mode === "encode") {
              e.preventDefault()
              switchEncodeMode("component")
            }
            break
          case "2":
            if (mode === "encode") {
              e.preventDefault()
              switchEncodeMode("full")
            }
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [output, copy, swap, switchMode, switchEncodeMode, mode])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
    { keys: ["Ctrl", "Shift", "S"], description: "Swap encode/decode" },
    { keys: ["Ctrl", "Shift", "E"], description: "Switch to encode mode" },
    { keys: ["Ctrl", "Shift", "D"], description: "Switch to decode mode" },
    { keys: ["Ctrl", "Shift", "1"], description: "Switch to encodeURIComponent" },
    { keys: ["Ctrl", "Shift", "2"], description: "Switch to encodeURI" },
  ]

  return (
    <div className="flex h-full flex-col">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      <div id="char-count" className="sr-only" aria-live="polite">
        {input ? `${input.length} characters input, ${output.length} characters output` : ""}
      </div>

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 flex-wrap border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="URL encoder controls">
        <span className="text-sm font-semibold shrink-0 mr-1">URL Encoder / Decoder</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Mode">
          <button onClick={() => switchMode("encode")} role="radio" aria-checked={mode === "encode"}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${mode === "encode" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            Encode <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
          </button>
          <button onClick={() => switchMode("decode")} role="radio" aria-checked={mode === "decode"}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${mode === "decode" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            Decode <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
          </button>
        </div>
        <button onClick={swap} disabled={!output} aria-label="Swap with output"
          className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 disabled:opacity-40 transition-colors flex items-center gap-1">
          <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />Swap <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
        </button>
        {mode === "encode" && (
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Encoding type">
            {([
              { key: "component" as EncodeMode, label: "encodeURIComponent", shortcut: "1" },
              { key: "full" as EncodeMode, label: "encodeURI", shortcut: "2" },
            ]).map(({ key, label, shortcut }) => (
              <button key={key} onClick={() => switchEncodeMode(key)} role="radio" aria-checked={encodeMode === key}
                className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors ${encodeMode === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {(input || output) && <span className="text-xs text-muted-foreground" aria-live="polite">{input.length} → {output.length} chars</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="URL Encoder" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}>
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">URL Encoder</h2>
          <ShortcutsModal pageName="URL Encoder" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Input
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Output
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Input panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="input-label">{mode === "encode" ? "Original Text / URL" : "Encoded URL"}</span>
            {mode === "encode" && (
              <div className="flex items-center gap-1 md:hidden" role="radiogroup" aria-label="Encoding type">
                {([
                  { key: "component" as EncodeMode, label: "encodeURIComponent" },
                  { key: "full" as EncodeMode, label: "encodeURI" },
                ]).map(({ key, label }) => (
                  <button key={key} onClick={() => switchEncodeMode(key)} role="radio" aria-checked={encodeMode === key}
                    className={`px-2 py-0.5 rounded border font-mono text-[10px] transition-colors ${encodeMode === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === "encode" ? "Enter text or URL to encode..." : "Paste encoded URL to decode..."}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
            aria-labelledby="input-label"
            aria-describedby="char-count"
          />
        </div>

        {/* Right Panel */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Output panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "encode" ? "Encoded Output" : "Decoded Text"}</span>
            {(input || output) && <span className="text-xs text-muted-foreground md:hidden" aria-live="polite">{input.length} → {output.length} chars</span>}
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-sm p-6" role="alert" aria-live="assertive">{error}</div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
              aria-labelledby="output-label"
            />
          )}
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-1">
          <button onClick={() => switchMode("encode")}
            className={`h-11 px-3 text-xs rounded-md border ${mode === "encode" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            Enc
          </button>
          <button onClick={() => switchMode("decode")}
            className={`h-11 px-3 text-xs rounded-md border ${mode === "decode" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            Dec
          </button>
          <button onClick={swap} disabled={!output} aria-label="Swap"
            className="h-11 px-2.5 rounded-md border border-border text-muted-foreground disabled:opacity-40">
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-4" onClick={copy} disabled={!output} aria-label="Copy output">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  )
}
