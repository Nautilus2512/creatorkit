"use client"

import { useState, useCallback } from "react"
import { Copy, Check, Upload, Download, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
        setOutput(btoa(unescape(encodeURIComponent(text))))
      } else {
        setOutput(decodeURIComponent(escape(atob(text.trim()))))
      }
    } catch {
      setError(currentMode === "decode" ? "Invalid Base64 string" : "Encoding failed")
      setOutput("")
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
  }

  const swap = () => {
    const newMode: Mode = mode === "encode" ? "decode" : "encode"
    setMode(newMode)
    setInput(output)
    process(output, newMode)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1]
      setInput(`[File: ${file.name}]`)
      setOutput(base64)
      setError("")
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `base64-${mode}d.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Base64 Encoder / Decoder</h1>
            <p className="text-sm text-muted-foreground">Encode text or files to Base64, or decode Base64 back to text</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={mode === "encode" ? "default" : "outline"} size="sm" onClick={() => switchMode("encode")}>
              Encode
            </Button>
            <Button variant={mode === "decode" ? "default" : "outline"} size="sm" onClick={() => switchMode("decode")}>
              Decode
            </Button>
            <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Swap
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "encode" ? "Plain Text Input" : "Base64 Input"}</h3>
            {mode === "encode" && (
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <Button variant="ghost" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Upload File</span>
                </Button>
              </label>
            )}
          </div>
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0"
          />
        </div>

        {/* Right Panel */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "encode" ? "Base64 Output" : "Decoded Text"}</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={download} disabled={!output}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-sm p-6">{error}</div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10"
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      {(output || input) && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
          <span>Input: {input.length} chars</span>
          {output && <span>Output: {output.length} chars</span>}
          {mode === "encode" && output && input.length > 0 && (
            <span>Ratio: {(output.length / input.length).toFixed(2)}x</span>
          )}
        </div>
      )}
    </div>
  )
}
