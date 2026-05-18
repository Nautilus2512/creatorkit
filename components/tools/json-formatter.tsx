"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { FileJson, Copy, Download, Check, AlertCircle, Minimize2, Maximize2, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

interface JsonError {
  line: number
  column: number
  message: string
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download JSON" },
  { keys: ["Ctrl", "Shift", "U"], description: "Upload file" },
  { keys: ["?"], description: "Toggle this panel" },
]

export default function JsonFormatter() {
  const [jsonInput, setJsonInput] = useState("")
  const [formattedJson, setFormattedJson] = useState("")
  const [minifiedJson, setMinifiedJson] = useState("")
  const [error, setError] = useState<JsonError | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [showMinified, setShowMinified] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (jsonInput.trim()) {
      validateAndFormatJson()
    } else {
      setFormattedJson("")
      setMinifiedJson("")
      setError(null)
      setIsValid(false)
    }
  }, [jsonInput])

  const validateAndFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonInput)
      setIsValid(true)
      setError(null)
      setFormattedJson(JSON.stringify(parsed, null, 2))
      setMinifiedJson(JSON.stringify(parsed))
      announceToScreenReader("Valid JSON")
    } catch (err) {
      setIsValid(false)
      setError(parseJsonError(err))
      setFormattedJson("")
      setMinifiedJson("")
      announceToScreenReader("Invalid JSON")
    }
  }, [jsonInput])

  const parseJsonError = (err: unknown): JsonError => {
    const errorString = String(err)
    const match = errorString.match(/position (\d+)/)
    if (match) {
      const position = parseInt(match[1])
      const lines = jsonInput.substring(0, position).split('\n')
      return { line: lines.length, column: lines[lines.length - 1].length + 1, message: (err as Error).message || "Invalid JSON" }
    }
    return { line: 1, column: 1, message: (err as Error).message || "Invalid JSON" }
  }

  const copy = useCallback(() => {
    if (!isValid) return
    navigator.clipboard.writeText(showMinified ? minifiedJson : formattedJson)
    setCopied(true)
    announceToScreenReader("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [isValid, showMinified, minifiedJson, formattedJson])

  const download = useCallback(() => {
    if (!isValid) return
    const text = showMinified ? minifiedJson : formattedJson
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = showMinified ? 'minified.json' : 'formatted.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    announceToScreenReader("JSON file downloaded")
    setTimeout(() => setDownloaded(false), 2000)
  }, [isValid, showMinified, minifiedJson, formattedJson])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setJsonInput(content)
      announceToScreenReader(`${file.name} uploaded`)
      setActiveTab("output")
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && isValid) {
        e.preventDefault()
        copy()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s" && isValid) {
        e.preventDefault()
        download()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("File upload dialog opened")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isValid, copy, download])

  return (
    <>
      <div className="flex flex-1 flex-col min-h-0">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="JSON Formatter controls">
          <span className="text-sm font-semibold shrink-0 mr-1">JSON Formatter</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <div className="flex items-center gap-2" role="group" aria-label="Output format">
            <Switch id="minified" checked={showMinified} onCheckedChange={(v) => { setShowMinified(v); announceToScreenReader(v ? "Minified output" : "Formatted output") }} />
            <Label htmlFor="minified" className="text-sm flex items-center gap-1">
              {showMinified ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {showMinified ? "Minified" : "Formatted"}
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fileInputRef.current?.click(); announceToScreenReader("File upload dialog opened") }}
            aria-label="Upload JSON file"
          >
            <FileJson className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Upload
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileUpload}
            aria-label="Select JSON file"
          />
          {jsonInput.trim() && (
            isValid ? (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300" role="status" aria-live="polite">
                <Check className="h-3 w-3 mr-1" aria-hidden="true" />Valid JSON
              </Badge>
            ) : (
              <Badge variant="destructive" role="alert">
                <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />Invalid JSON
              </Badge>
            )
          )}
          {error && (
            <span className="text-xs text-destructive" role="alert" aria-live="assertive">Line {error.line}, Col {error.column}: {error.message}</span>
          )}
          {isValid && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {showMinified ? `${minifiedJson.length} chars` : `${formattedJson.split('\n').length} lines`}
            </span>
          )}

          {/* RIGHT: primary output actions + ShortcutsModal */}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="JSON Formatter" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={() => copy()} disabled={!isValid} aria-label={copied ? "Copied to clipboard" : "Copy formatted JSON"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
            </Button>
            <Button size="sm" variant={downloaded ? "outline" : "default"} onClick={() => download()} disabled={!isValid} aria-label={downloaded ? "File downloaded" : "Download JSON file"}>
              {downloaded ? <FileCheck className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
              {downloaded ? "Saved!" : "Download"}
              <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${downloaded ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">JSON Formatter</h2>
            <ShortcutsModal pageName="JSON Formatter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              JSON Input
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Output
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="JSON Input" aria-labelledby="input-panel-label">
            <div className="flex-1 flex flex-col overflow-y-auto">
              <Textarea
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); announceToScreenReader("Input updated") }}
                placeholder="Paste or type your JSON here..."
                className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                spellCheck={false}
                aria-label="JSON input"
                id="json-input"
              />
              <div className="md:hidden h-[60px] shrink-0" aria-hidden="true" />
            </div>
          </div>

          {/* Output panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Output" aria-labelledby="output-panel-label">
            <div className="flex-1 overflow-y-auto">
              {isValid ? (
                <Textarea
                  value={showMinified ? minifiedJson : formattedJson}
                  readOnly
                  className="h-full resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
                  spellCheck={false}
                  aria-label="Formatted JSON output"
                />
              ) : error ? (
                <div className="p-4 text-destructive text-sm font-mono" role="alert">
                  <AlertCircle className="h-4 w-4 mb-2" aria-hidden="true" />
                  <div>JSON Error at Line {error.line}, Column {error.column}:</div>
                  <div className="mt-1">{error.message}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-16" role="status">
                  <FileJson className="h-12 w-12 opacity-30" aria-hidden="true" />
                  <p className="text-sm">Enter JSON to see formatted output</p>
                </div>
              )}
              <div className="p-4 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                  <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                    <li>Paste or type your JSON into the left panel, or click <span className="text-foreground font-medium">Upload</span> (<span className="text-foreground font-medium">Ctrl+Shift+U</span>) to load a file.</li>
                    <li>The output validates and formats automatically as you type. Errors show the exact line and column.</li>
                    <li>Toggle <span className="text-foreground font-medium">Minified</span> in the toolbar to switch between pretty-printed and minified output.</li>
                    <li>Copy the result with <span className="text-foreground font-medium">Ctrl+Shift+V</span> or download it with <span className="text-foreground font-medium">Ctrl+Shift+S</span>.</li>
                  </ol>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tips</p>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                      <li>The status badge in the toolbar shows instantly whether your JSON is valid or invalid.</li>
                      <li>Minified output removes all whitespace. Formatted output uses 2-space indentation.</li>
                      <li>The line and column count in the toolbar updates as you edit.</li>
                      <li>Everything runs in your browser. Nothing is sent to a server.</li>
                    </ul>
                  </div>
                </div>
                <div className="md:hidden h-[60px]" aria-hidden="true" />
              </div>
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-1.5">
            <Switch id="minified-mobile" checked={showMinified} onCheckedChange={(v) => { setShowMinified(v); announceToScreenReader(v ? "Minified output" : "Formatted output") }} />
            <Label htmlFor="minified-mobile" className="text-xs">{showMinified ? "Minified" : "Formatted"}</Label>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-11 px-3" onClick={() => { fileInputRef.current?.click(); announceToScreenReader("File upload dialog opened") }} aria-label="Upload JSON file">
            <FileJson className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={() => copy()} disabled={!isValid} aria-label={copied ? "Copied to clipboard" : "Copy JSON"}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button size="sm" variant={downloaded ? "outline" : "default"} className="h-11 px-3" onClick={() => download()} disabled={!isValid} aria-label={downloaded ? "File downloaded" : "Download JSON file"}>
            {downloaded ? <FileCheck className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            <span className="ml-1 text-xs">{downloaded ? "Saved!" : "Save"}</span>
          </Button>
        </div>

      </div>
    </>
  )
}
