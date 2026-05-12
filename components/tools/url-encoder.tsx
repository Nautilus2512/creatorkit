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
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">URL Encoder / Decoder</h2>
          <p className="text-muted-foreground">Encode or decode URL components and full URLs</p>
        </div>
        <ShortcutsModal pageName="URL Encoder" shortcuts={shortcuts} />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="URL encoding options">
        <Button 
          variant={mode === "encode" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("encode")}
          aria-pressed={mode === "encode"}
          aria-label="Switch to encode mode"
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>Encode</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>E</span>
          </kbd>
        </Button>
        <Button 
          variant={mode === "decode" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("decode")}
          aria-pressed={mode === "decode"}
          aria-label="Switch to decode mode"
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>Decode</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>D</span>
          </kbd>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={swap} 
          disabled={!output}
          aria-label="Swap encode and decode with output"
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Swap</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>S</span>
          </kbd>
        </Button>
        {mode === "encode" && (
          <>
            <div className="w-px h-4 bg-border" aria-hidden="true" />
            {([
              { key: "component", label: "encodeURIComponent", hint: "Encodes all special chars (for query params)", shortcut: "1" },
              { key: "full", label: "encodeURI", hint: "Preserves URL structure (for full URLs)", shortcut: "2" },
            ] as { key: EncodeMode; label: string; hint: string; shortcut: string }[]).map(({ key, label, hint, shortcut }) => (
              <button
                key={key}
                onClick={() => switchEncodeMode(key)}
                title={`${hint} (Ctrl+Shift+${shortcut})`}
                role="radio"
                aria-checked={encodeMode === key}
                aria-label={`${label}, press Ctrl+Shift+${shortcut} to toggle`}
                className={`text-xs px-3 py-1 rounded-full border transition-colors font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 ${encodeMode === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {label}
                <kbd className="ml-1.5 pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-background/60 px-1 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
                  <span>Ctrl</span><span>Shift</span><span>{shortcut}</span>
                </kbd>
              </button>
            ))}
          </>
        )}
        {(input || output) && (
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">{input.length} → {output.length} chars</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Input panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="input-label">{mode === "encode" ? "Original Text / URL" : "Encoded URL"}</span>
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
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Output panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "encode" ? "Encoded Output" : "Decoded Text"}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copy} 
              disabled={!output}
              aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                <span>Ctrl</span><span>Shift</span><span>C</span>
              </kbd>
            </Button>
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

      <div id="char-count" className="sr-only" aria-live="polite">
        {input ? `${input.length} characters input, ${output.length} characters output` : ""}
      </div>
    </div>
  )
}
