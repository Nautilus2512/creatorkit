"use client"

import { useState, useEffect } from "react"
import { 
  FileJson, Copy, Download, Check, AlertCircle, 
  Minimize2, Maximize2, Eye, EyeOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      
      // Format with 2 spaces
      const formatted = JSON.stringify(parsed, null, 2)
      setFormattedJson(formatted)
      
      // Minify
      const minified = JSON.stringify(parsed)
      setMinifiedJson(minified)
    } catch (err) {
      setIsValid(false)
      setError(parseJsonError(err))
      setFormattedJson("")
      setMinifiedJson("")
    }
  }

  const parseJsonError = (err: any): JsonError => {
    const errorString = err.toString()
    const match = errorString.match(/position (\d+)/)
    
    if (match) {
      const position = parseInt(match[1])
      const lines = jsonInput.substring(0, position).split('\n')
      return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
        message: err.message || "Invalid JSON"
      }
    }
    
    return {
      line: 1,
      column: 1,
      message: err.message || "Invalid JSON"
    }
  }

  const copyToClipboard = () => {
    const textToCopy = showMinified ? minifiedJson : formattedJson
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadJson = () => {
    const textToDownload = showMinified ? minifiedJson : formattedJson
    const blob = new Blob([textToDownload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = showMinified ? 'formatted.json' : 'minified.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">JSON Formatter</h1>
            <p className="text-sm text-muted-foreground">Format, validate, and minify JSON</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Switch
                id="minified"
                checked={showMinified}
                onCheckedChange={setShowMinified}
              />
              <Label htmlFor="minified" className="text-sm">
                {showMinified ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {showMinified ? "Minified" : "Formatted"}
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={!isValid}
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadJson}
              disabled={!isValid}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {jsonInput.trim() && (
        <div className="shrink-0 border-b border-border bg-muted/30">
          <div className="px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isValid ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Valid JSON
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Invalid JSON
                </Badge>
              )}
              {isValid && (
                <span className="text-sm text-muted-foreground">
                  {showMinified ? `${minifiedJson.length} chars` : `${formattedJson.split('\n').length} lines`}
                </span>
              )}
            </div>
            {error && (
              <div className="text-sm text-destructive">
                Line {error.line}, Column {error.column}: {error.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Input
            </h3>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste or type your JSON here..."
              className="h-full w-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium flex items-center gap-2">
              {showMinified ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {showMinified ? "Minified" : "Formatted"} Output
            </h3>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {isValid ? (
              <Textarea
                value={showMinified ? minifiedJson : formattedJson}
                readOnly
                className="h-full w-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4 bg-muted/20"
                spellCheck={false}
              />
            ) : error ? (
              <div className="flex-1 p-4 text-destructive text-sm font-mono">
                <AlertCircle className="h-4 w-4 mb-2" />
                <div>JSON Error:</div>
                <div className="mt-2">Line {error.line}, Column {error.column}</div>
                <div>{error.message}</div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <FileJson className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-center">Enter JSON to see formatted output</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}