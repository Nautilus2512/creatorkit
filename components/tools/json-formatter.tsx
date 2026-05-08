"use client"

import { useState, useEffect } from "react"
import { FileJson, Copy, Download, Check, AlertCircle, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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

  const validateAndFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      setIsValid(true)
      setError(null)
      setFormattedJson(JSON.stringify(parsed, null, 2))
      setMinifiedJson(JSON.stringify(parsed))
    } catch (err) {
      setIsValid(false)
      setError(parseJsonError(err))
      setFormattedJson("")
      setMinifiedJson("")
    }
  }

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

  const copy = () => {
    navigator.clipboard.writeText(showMinified ? minifiedJson : formattedJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
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
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">JSON Formatter</h2>
        <p className="text-muted-foreground">Format, validate, and minify JSON</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="minified" checked={showMinified} onCheckedChange={setShowMinified} />
          <Label htmlFor="minified" className="text-sm flex items-center gap-1">
            {showMinified ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {showMinified ? "Minified" : "Formatted"}
          </Label>
        </div>
        {jsonInput.trim() && (
          isValid ? (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300">
              <Check className="h-3 w-3 mr-1" />Valid JSON
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />Invalid JSON
            </Badge>
          )
        )}
        {error && (
          <span className="text-xs text-destructive">Line {error.line}, Col {error.column}: {error.message}</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
            <FileJson className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">JSON Input</span>
          </div>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste or type your JSON here..."
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
            spellCheck={false}
          />
        </div>

        {/* Right Panel — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showMinified ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">{showMinified ? "Minified" : "Formatted"} Output</span>
              {isValid && (
                <span className="text-xs text-muted-foreground">
                  {showMinified ? `${minifiedJson.length} chars` : `${formattedJson.split('\n').length} lines`}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copy} disabled={!isValid}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={download} disabled={!isValid}>
                <Download className="h-4 w-4 mr-1" />Download
              </Button>
            </div>
          </div>
          {isValid ? (
            <Textarea
              value={showMinified ? minifiedJson : formattedJson}
              readOnly
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
              spellCheck={false}
            />
          ) : error ? (
            <div className="flex-1 p-4 text-destructive text-sm font-mono">
              <AlertCircle className="h-4 w-4 mb-2" />
              <div>JSON Error at Line {error.line}, Column {error.column}:</div>
              <div className="mt-1">{error.message}</div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <FileJson className="h-12 w-12 opacity-30" />
              <p className="text-sm">Enter JSON to see formatted output</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
