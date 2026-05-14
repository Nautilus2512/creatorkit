"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Upload, Download, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  const el = document.createElement("div")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.setAttribute("aria-atomic", "true")
  el.className = "sr-only"
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => document.body.removeChild(el), 1000)
}

type Mode = "encode" | "decode"

export default function Base64Encoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const process = useCallback((text: string, currentMode: Mode) => {
    setError("")
    if (!text) { setOutput(""); return }
    try {
      if (currentMode === "encode") {
        const encoded = btoa(unescape(encodeURIComponent(text)))
        setOutput(encoded)
        announceToScreenReader(`Text encoded to Base64. Output is ${encoded.length} characters.`)
      } else {
        const decoded = decodeURIComponent(escape(atob(text.trim())))
        setOutput(decoded)
        announceToScreenReader(`Base64 decoded to text. Output is ${decoded.length} characters.`)
      }
    } catch {
      const errorMsg = currentMode === "decode" ? "Invalid Base64 string" : "Encoding failed"
      setError(errorMsg)
      setOutput("")
      announceToScreenReader(`Error: ${errorMsg}`)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setInput(value)
    process(value, mode)
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setInput("")
    setOutput("")
    setError("")
    announceToScreenReader(`Switched to ${newMode} mode`)
  }

  const swap = useCallback(() => {
    if (!output) return
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
    process(output, newMode)
    announceToScreenReader(`Swapped to ${newMode} mode with previous output`)
  }, [output, mode, process])

  const triggerUpload = () => {
    ;(document.getElementById("file-upload") as HTMLInputElement)?.click()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    announceToScreenReader(`Reading file ${file.name}…`)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]
      setInput(`[File: ${file.name}]`)
      setOutput(base64)
      setError("")
      setActiveTab("output")
      announceToScreenReader(`${file.name} encoded. Output is ${base64.length} characters.`)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader("Output copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const download = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `base64-${mode}d.txt`
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("File download started")
  }, [output, mode])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case "o": e.preventDefault(); if (mode === "encode") triggerUpload(); return
        case "x": e.preventDefault(); swap(); return
        case "c": e.preventDefault(); if (output) copy(); return
        case "d": e.preventDefault(); if (output) download(); return
      }
    }
    if (e.key === "Escape" && error) { e.preventDefault(); setError("") }
  }, [swap, copy, download, output, error, mode])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [handleKeyDown])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "O"], description: "Upload file (encode mode)" },
    { keys: ["Ctrl", "Shift", "X"], description: "Swap input/output" },
    { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download output" },
    { keys: ["?"], description: "Toggle shortcuts panel" },
  ]

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only" />
      <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} aria-label="Upload file to encode" />

      <div className="flex h-full flex-col">

        {/* ── Desktop: top action bar ── */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Base64 controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Base64</span>
          <div className="h-4 w-px bg-border" aria-hidden="true" />
          <Button variant={mode === "encode" ? "default" : "outline"} size="sm" onClick={() => switchMode("encode")} aria-pressed={mode === "encode"}>Encode</Button>
          <Button variant={mode === "decode" ? "default" : "outline"} size="sm" onClick={() => switchMode("decode")} aria-pressed={mode === "decode"}>Decode</Button>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <Button variant="ghost" size="sm" onClick={swap} disabled={!output} aria-label="Swap input and output">
            <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
          </Button>
          {mode === "encode" && (
            <Button variant="ghost" size="sm" onClick={triggerUpload} aria-label="Upload file">
              <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+O</kbd>
            </Button>
          )}
          {(input || output) && (
            <span className="text-xs text-muted-foreground" aria-live="polite">{input.length} → {output.length} chars</span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Base64 Encoder / Decoder" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={copy} disabled={!output} aria-label="Copy output">
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button size="sm" onClick={download} disabled={!output} aria-label="Download output">
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          </div>
        </div>

        {/* ── Mobile: compact header + tab switcher ── */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Base64 Encoder / Decoder</h2>
            <ShortcutsModal pageName="Base64 Encoder / Decoder" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button
              role="tab"
              aria-selected={activeTab === "input"}
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {mode === "encode" ? "Plain Text" : "Base64 Input"}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "output"}
              onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {mode === "encode" ? "Base64 Output" : "Decoded Text"}
            </button>
          </div>
        </div>

        {/* ── Panels ── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region"
            aria-label={mode === "encode" ? "Plain text input" : "Base64 input"}
          >
            <Textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={mode === "encode" ? "Enter text to encode…" : "Enter Base64 to decode…"}
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
              aria-label={mode === "encode" ? "Plain text to encode" : "Base64 string to decode"}
            />
          </div>

          {/* Output panel */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region"
            aria-label={mode === "encode" ? "Base64 output" : "Decoded text"}
          >
            {error ? (
              <div className="flex-1 flex items-center justify-center text-destructive text-sm p-6" role="alert" aria-live="assertive">{error}</div>
            ) : (
              <Textarea
                value={output}
                readOnly
                placeholder="Output will appear here…"
                className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
                aria-live="polite"
              />
            )}
          </div>
        </div>

        {/* ── Mobile: bottom action bar ── */}
        <div
          className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant={mode === "encode" ? "default" : "outline"} size="sm" className="h-11 px-3 text-xs" onClick={() => switchMode("encode")} aria-pressed={mode === "encode"}>Enc</Button>
          <Button variant={mode === "decode" ? "default" : "outline"} size="sm" className="h-11 px-3 text-xs" onClick={() => switchMode("decode")} aria-pressed={mode === "decode"}>Dec</Button>
          <Button variant="ghost" size="sm" className="h-11 px-2" onClick={swap} disabled={!output} aria-label="Swap">
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          {mode === "encode" && (
            <Button variant="ghost" size="sm" className="h-11 px-2" onClick={triggerUpload} aria-label="Upload file">
              <Upload className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={copy} disabled={!output} aria-label={copied ? "Copied!" : "Copy output"}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button size="sm" className="h-11 px-3" onClick={download} disabled={!output} aria-label="Download output">
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="ml-1 text-xs">Save</span>
          </Button>
        </div>

      </div>
    </>
  )
}
