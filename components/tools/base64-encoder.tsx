"use client"

import { useState, useCallback, useEffect, useRef } from "react"
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
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const process = useCallback((text: string, currentMode: Mode) => {
    setError("")
    if (!text) { setOutput(""); return }
    try {
      if (currentMode === "encode") {
        const encoded = btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(""))
        setOutput(encoded)
        announceToScreenReader(`Text encoded to Base64. Output is ${encoded.length} characters.`)
      } else {
        const decoded = new TextDecoder().decode(Uint8Array.from(atob(text.trim()), c => c.charCodeAt(0)))
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
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (!(e.ctrlKey || e.metaKey)) return
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case "e": e.preventDefault(); switchMode("encode"); return
        case "z": e.preventDefault(); switchMode("decode"); return
        case "f": e.preventDefault(); setActiveTab("input"); inputRef.current?.focus(); return
        case "u": e.preventDefault(); if (mode === "encode") triggerUpload(); return
        case "x": e.preventDefault(); swap(); return
        case "v": e.preventDefault(); if (output) copy(); return
        case "s": e.preventDefault(); if (output) download(); return
      }
    }
    if (e.key === "Escape" && error) { e.preventDefault(); setError("") }
  }, [swap, copy, download, switchMode, output, error, mode])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "E"], description: "Switch to Encode mode" },
    { keys: ["Ctrl", "Shift", "Z"], description: "Switch to Decode mode" },
    { keys: ["Ctrl", "Shift", "F"], description: "Focus input" },
    { keys: ["Ctrl", "Shift", "U"], description: "Upload file (encode mode)" },
    { keys: ["Ctrl", "Shift", "X"], description: "Swap input/output" },
    { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
    { keys: ["Ctrl", "Shift", "S"], description: "Download output" },
    { keys: ["?"], description: "Toggle shortcuts panel" },
  ]

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only" />
      <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} aria-label="Upload file to encode" />

      <div className="flex flex-1 flex-col min-h-0">

        {/* ── Desktop: top action bar ── */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Base64 controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Base64</span>
          <div className="h-4 w-px bg-border" aria-hidden="true" />
          <Button variant={mode === "encode" ? "default" : "outline"} size="sm" onClick={() => switchMode("encode")} aria-pressed={mode === "encode"}>
            Encode
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${mode === "encode" ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+E</kbd>
          </Button>
          <Button variant={mode === "decode" ? "default" : "outline"} size="sm" onClick={() => switchMode("decode")} aria-pressed={mode === "decode"}>
            Decode
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${mode === "decode" ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+Z</kbd>
          </Button>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <Button variant="ghost" size="sm" onClick={swap} disabled={!output} aria-label="Swap input and output">
            <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
          </Button>
          {mode === "encode" && (
            <Button variant="ghost" size="sm" onClick={triggerUpload} aria-label="Upload file">
              <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
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
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
            </Button>
            <Button size="sm" onClick={download} disabled={!output} aria-label="Download output">
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
              <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
        </div>

        {/* ── Mobile: compact header + tab switcher ── */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h2 className="text-base font-semibold">Base64 Encoder / Decoder</h2>
            <ShortcutsModal pageName="Base64 Encoder / Decoder" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button
              role="tab"
              aria-selected={activeTab === "input"}
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {mode === "encode" ? "Plain Text" : "Base64 Input"}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "output"}
              onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {mode === "encode" ? "Base64 Output" : "Decoded Text"}
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Panels card */}
          <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

            {/* Input panel */}
            <div
              className={`relative ${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
              role="region"
              aria-label={mode === "encode" ? "Plain text input" : "Base64 input"}
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={mode === "encode" ? "Enter text to encode…" : "Enter Base64 to decode…"}
                className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
                aria-label={mode === "encode" ? "Plain text to encode" : "Base64 string to decode"}
              />
              {!input && (
                <div className="absolute bottom-3 right-3 hidden md:flex items-center gap-1.5 pointer-events-none select-none" aria-hidden="true">
                  <span className="text-[10px] text-muted-foreground/40">focus input</span>
                  <kbd className="rounded border border-border/50 bg-muted/50 px-1 text-[10px] text-muted-foreground/40">Ctrl+Shift+F</kbd>
                </div>
              )}
            </div>

            {/* Output panel */}
            <div
              className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
              role="region"
              aria-label={mode === "encode" ? "Base64 output" : "Decoded text"}
            >
              {error ? (
                <div className="flex-1 p-4" role="alert" aria-live="assertive">
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                  </div>
                </div>
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

          {/* Usage guide */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">What it does</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">Base64</span> encodes any text or file into a string of printable ASCII characters, and decodes it back to the original. It is used in emails, data URLs, and web APIs to safely pass binary data through text-only systems.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Select <span className="text-foreground font-medium">Encode</span> to convert text to Base64, or <span className="text-foreground font-medium">Decode</span> to reverse it.</li>
                <li>Type or paste your content into the left panel. The result appears instantly on the right.</li>
                <li>Click <span className="text-foreground font-medium">Copy</span> to copy the output to your clipboard, or <span className="text-foreground font-medium">Download</span> to save it as a file.</li>
                <li>In Encode mode, click <span className="text-foreground font-medium">Upload</span> to encode any file directly to Base64.</li>
                <li>Click <span className="text-foreground font-medium">Swap</span> to send the current output back to the input and reverse the operation.</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+E</kbd> to switch to Encode mode, <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+Z</kbd> to switch to Decode.</li>
                <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+F</kbd> to focus the input panel from anywhere on the page.</li>
                <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+X</kbd> to swap, <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> to copy, <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd> to download.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                <li>Base64 increases data size by roughly 33 percent. This is expected and normal.</li>
                <li>If Decode shows an error, check that the input has no extra spaces, line breaks, or missing padding characters.</li>
                <li>Everything runs in your browser. Nothing is sent to a server.</li>
              </ul>
            </div>

          </div>

          <div className="md:hidden h-[60px]" aria-hidden="true" />
        </div>

        {/* ── Mobile: bottom action bar ── */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant={mode === "encode" ? "default" : "outline"} size="sm" className="h-11 px-3 text-xs" onClick={() => switchMode("encode")} aria-pressed={mode === "encode"} aria-label="Switch to Encode mode">Enc</Button>
          <Button variant={mode === "decode" ? "default" : "outline"} size="sm" className="h-11 px-3 text-xs" onClick={() => switchMode("decode")} aria-pressed={mode === "decode"} aria-label="Switch to Decode mode">Dec</Button>
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
