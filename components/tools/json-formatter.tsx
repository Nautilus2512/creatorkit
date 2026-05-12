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

export default function JsonFormatter() {
  const [jsonInput, setJsonInput] = useState("")
  const [formattedJson, setFormattedJson] = useState("")
  const [minifiedJson, setMinifiedJson] = useState("")
  const [error, setError] = useState<JsonError | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [showMinified, setShowMinified] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
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
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c" && isValid) {
        e.preventDefault()
        copy()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s" && isValid) {
        e.preventDefault()
        download()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
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
      <ShortcutsModal
        pageName="JSON Formatter"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
          { keys: ["Ctrl", "Shift", "S"], description: "Download JSON" },
          { keys: ["Ctrl", "Shift", "O"], description: "Upload file" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
      <div className="flex h-full flex-col gap-3 p-4" role="main" aria-label="JSON Formatter tool">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">JSON Formatter</h2>
          <p className="text-muted-foreground">Format, validate, and minify JSON. Press ? for shortcuts.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Output format">
            <Switch id="minified" checked={showMinified} onCheckedChange={(v) => { setShowMinified(v); announceToScreenReader(v ? "Minified output" : "Formatted output") }} />
            <Label htmlFor="minified" className="text-sm flex items-center gap-1">
              {showMinified ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {showMinified ? "Minified" : "Formatted"}
            </Label>
          </div>
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
        </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="input-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium" id="input-panel-label">JSON Input</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { fileInputRef.current?.click(); announceToScreenReader("File upload dialog opened") }}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Upload JSON file"
            >
              <FileJson className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Upload
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+O</kbd>
            </Button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json,application/json" 
              className="hidden" 
              onChange={handleFileUpload}
              aria-label="Select JSON file"
            />
          </div>
          <Textarea
            value={jsonInput}
            onChange={(e) => { setJsonInput(e.target.value); announceToScreenReader("Input updated") }}
            placeholder="Paste or type your JSON here..."
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            spellCheck={false}
            aria-label="JSON input"
            id="json-input"
          />
        </div>

        {/* Right Panel — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="output-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showMinified ? <Minimize2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              <span className="text-sm font-medium" id="output-panel-label">{showMinified ? "Minified" : "Formatted"} Output</span>
              {isValid && (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {showMinified ? `${minifiedJson.length} chars` : `${formattedJson.split('\n').length} lines`}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copy()} 
                disabled={!isValid}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={copied ? "Copied to clipboard" : "Copy formatted JSON"}
              >
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}
                <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+C</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => download()} 
                disabled={!isValid}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={downloaded ? "File downloaded" : "Download JSON file"}
              >
                {downloaded ? <FileCheck className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
                {downloaded ? "Saved!" : "Download"}
                <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+S</kbd>
              </Button>
            </div>
          </div>
          {isValid ? (
            <Textarea
              value={showMinified ? minifiedJson : formattedJson}
              readOnly
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
              spellCheck={false}
              aria-label="Formatted JSON output"
            />
          ) : error ? (
            <div className="flex-1 p-4 text-destructive text-sm font-mono" role="alert">
              <AlertCircle className="h-4 w-4 mb-2" aria-hidden="true" />
              <div>JSON Error at Line {error.line}, Column {error.column}:</div>
              <div className="mt-1">{error.message}</div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2" role="status">
              <FileJson className="h-12 w-12 opacity-30" aria-hidden="true" />
              <p className="text-sm">Enter JSON to see formatted output</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
