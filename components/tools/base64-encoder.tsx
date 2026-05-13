"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Upload, Download, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Accessibility helper for screen reader announcements
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

type Mode = "encode" | "decode"

export default function Base64Encoder() {
  const [mode, setMode] = useState<Mode>("encode")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

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

  const swap = () => {
    if (!output) return
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
    process(output, newMode)
    announceToScreenReader(`Swapped to ${newMode} mode with previous output`)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    announceToScreenReader(`Reading file ${file.name}...`)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1]
      setInput(`[File: ${file.name}]`)
      setOutput(base64)
      setError("")
      announceToScreenReader(`File ${file.name} converted to Base64. Output is ${base64.length} characters.`)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader('Output copied to clipboard')
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
    announceToScreenReader('File download started')
  }, [output, mode])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in textareas/inputs
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
      return
    }
    
    // Ctrl+Shift+O to upload file (encode mode only)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
      e.preventDefault()
      e.stopPropagation()
      if (mode === "encode") {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        fileInput?.click()
      }
      return
    }
    
    // Ctrl+Shift+X to swap
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault()
      e.stopPropagation()
      swap()
      return
    }
    
    // Ctrl+Shift+C to copy output
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault()
      e.stopPropagation()
      if (output) {
        copy()
      }
      return
    }
    
    // Ctrl+Shift+D to download
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
      e.preventDefault()
      e.stopPropagation()
      if (output) {
        download()
      }
      return
    }
    
    // Escape to clear error
    if (e.key === "Escape" && error) {
      e.preventDefault()
      setError("")
    }
  }, [swap, copy, download, output, error, mode])

  // Register keyboard shortcuts
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [handleKeyDown])

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div role="banner">
        <h2 className="text-2xl font-semibold tracking-tight" id="base64-title">Base64 Encoder / Decoder</h2>
        <p className="text-muted-foreground" id="base64-description">Encode text or files to Base64, or decode Base64 back to text. Press ? for keyboard shortcuts.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Base64 controls">
        <Button 
          variant={mode === "encode" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("encode")}
          aria-pressed={mode === "encode"}
          aria-label="Switch to encode mode"
        >
          Encode
        </Button>
        <Button 
          variant={mode === "decode" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("decode")}
          aria-pressed={mode === "decode"}
          aria-label="Switch to decode mode"
        >
          Decode
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={swap} 
          disabled={!output}
          aria-label="Swap input and output"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
        </Button>
        {(input || output) && (
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
            {input.length} → {output.length} chars
            {mode === "encode" && output && input.length > 0 && ` (${(output.length / input.length).toFixed(2)}x)`}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Input text">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="input-label">{mode === "encode" ? "Plain Text Input" : "Base64 Input"}</span>
            {mode === "encode" && (
              <>
                <input 
                  type="file" 
                  id="file-upload"
                  className="hidden" 
                  onChange={handleFileUpload}
                  aria-label="Upload file to encode"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const fileInput = document.getElementById('file-upload') as HTMLInputElement
                    fileInput?.click()
                  }}
                  aria-label="Upload file"
                >
                <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Control + O</kbd>
              </Button>
              </>
            )}
          </div>
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
            aria-labelledby="input-label"
            aria-describedby="input-hint"
          />
          <span id="input-hint" className="sr-only">{mode === "encode" ? "Type or paste text to encode" : "Type or paste Base64 string to decode"}</span>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Output result">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "encode" ? "Base64 Output" : "Decoded Text"}</span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copy} 
                disabled={!output}
                aria-label="Copy output to clipboard"
              >
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}<kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={download} 
                disabled={!output}
                aria-label="Download output as file"
              >
                <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-sm p-6" role="alert" aria-live="assertive">
              <span>{error}</span>
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
              aria-labelledby="output-label"
              aria-live="polite"
            />
          )}
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="Base64 Encoder / Decoder"
      shortcuts={[
        { keys: ["Ctrl", "O"], description: "Upload file (encode mode only)" },
        { keys: ["Ctrl", "Shift", "X"], description: "Swap input/output" },
        { keys: ["Ctrl", "Shift", "C"], description: "Copy output to clipboard" },
        { keys: ["Ctrl", "Shift", "D"], description: "Download output as file" },
        { keys: ["Escape"], description: "Clear error message" },
        { keys: ["?"], description: "Toggle this shortcuts panel" },
        { keys: ["Tab"], description: "Navigate between controls" },
        { keys: ["Enter"], description: "Activate focused button" },
      ]}
    />
    </>
  )
}
