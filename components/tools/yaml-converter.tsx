"use client"

import { useState, useCallback, useEffect } from "react"
import yaml from "js-yaml"
import { Copy, Check, ArrowLeftRight, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Mode = "yaml-to-json" | "json-to-yaml"

const EXAMPLE_YAML = `name: John Doe
age: 30
address:
  street: 123 Main St
  city: Springfield
  zip: "12345"
hobbies:
  - reading
  - coding
  - hiking
active: true`

const EXAMPLE_JSON = `{
  "name": "John Doe",
  "age": 30,
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "zip": "12345"
  },
  "hobbies": ["reading", "coding", "hiking"],
  "active": true
}`

export default function YamlConverter() {
  const [mode, setMode] = useState<Mode>("yaml-to-json")
  const [input, setInput] = useState("")
  const [indent, setIndent] = useState(2)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  let output = ""
  let error = ""
  if (input.trim()) {
    try {
      if (mode === "yaml-to-json") {
        output = JSON.stringify(yaml.load(input), null, indent)
      } else {
        output = yaml.dump(JSON.parse(input), { indent })
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Parse error"
    }
  }

  const switchMode = useCallback((newMode: Mode) => { 
    setMode(newMode); 
    setInput("") 
    announceToScreenReader(`Switched to ${newMode === "yaml-to-json" ? "YAML to JSON" : "JSON to YAML"} mode`)
  }, [announceToScreenReader])

  const swap = useCallback(() => {
    const newMode: Mode = mode === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json"
    setMode(newMode)
    setInput(output)
    announceToScreenReader(`Swapped to ${newMode === "yaml-to-json" ? "YAML to JSON" : "JSON to YAML"} mode`)
  }, [mode, output, announceToScreenReader])

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [output, announceToScreenReader])

  const download = useCallback(() => {
    if (!output) return
    const ext = mode === "yaml-to-json" ? "json" : "yaml"
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `output.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader(`${ext.toUpperCase()} file downloaded`)
  }, [output, mode, announceToScreenReader])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(reader.result as string)
      announceToScreenReader(`File loaded: ${file.name}`)
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [announceToScreenReader])

  const changeIndent = useCallback((newIndent: number) => {
    setIndent(newIndent)
    announceToScreenReader(`Indent changed to ${newIndent} spaces`)
  }, [announceToScreenReader])

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
          case "d":
            if (output) {
              e.preventDefault()
              download()
            }
            break
          case "s":
            if (output) {
              e.preventDefault()
              swap()
            }
            break
          case "y":
            e.preventDefault()
            switchMode("yaml-to-json")
            break
          case "j":
            e.preventDefault()
            switchMode("json-to-yaml")
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [output, copy, download, swap, switchMode])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download file" },
    { keys: ["Ctrl", "Shift", "S"], description: "Swap modes" },
    { keys: ["Ctrl", "Shift", "Y"], description: "Switch to YAML to JSON" },
    { keys: ["Ctrl", "Shift", "J"], description: "Switch to JSON to YAML" },
  ]

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">YAML ↔ JSON Converter</h2>
          <p className="text-muted-foreground">Convert between YAML and JSON formats. Runs entirely in your browser.</p>
        </div>
        <ShortcutsModal pageName="YAML Converter" shortcuts={shortcuts} />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Conversion options">
        <Button 
          variant={mode === "yaml-to-json" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("yaml-to-json")}
          aria-pressed={mode === "yaml-to-json"}
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>YAML → JSON</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+Y</kbd>
        </Button>
        <Button 
          variant={mode === "json-to-yaml" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("json-to-yaml")}
          aria-pressed={mode === "json-to-yaml"}
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>JSON → YAML</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+J</kbd>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={swap} 
          disabled={!output}
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Swap input and output"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Swap</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd>
        </Button>
        <div className="h-4 w-px bg-border" aria-hidden="true" />
        <span className="text-xs text-muted-foreground" id="indent-label">Indent:</span>
        {[2, 4].map(n => (
          <button
            key={n}
            onClick={() => changeIndent(n)}
            role="radio"
            aria-checked={indent === n}
            aria-labelledby="indent-label"
            className={`text-xs px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${indent === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            {n} spaces
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Input panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="input-label">{mode === "yaml-to-json" ? "YAML Input" : "JSON Input"}</span>
            <div className="flex gap-1" role="group" aria-label="Input actions">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setInput(mode === "yaml-to-json" ? EXAMPLE_YAML : EXAMPLE_JSON); announceToScreenReader("Example loaded") }}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Load example"
              >
                Example
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".yaml,.yml,.json" className="hidden" onChange={handleFile} aria-label="Upload file" />
                <Button variant="ghost" size="sm" asChild className="focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <span><Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload</span>
                </Button>
              </label>
            </div>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "yaml-to-json" ? "name: John\nage: 30\nhobbies:\n  - reading" : '{\n  "name": "John",\n  "age": 30\n}'}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
            aria-labelledby="input-label"
          />
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Output panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "yaml-to-json" ? "JSON Output" : "YAML Output"}</span>
            <div className="flex gap-1" role="group" aria-label="Output actions">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copy} 
                disabled={!output}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}
              >
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
                <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+C</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={download} 
                disabled={!output}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Download output file"
              >
                <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                <span>Download</span>
                <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+D</kbd>
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex-1 p-4" role="alert" aria-live="assertive">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium mb-1">Parse Error</p>
                <p className="font-mono text-xs">{error}</p>
              </div>
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Output will appear here..."
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10 p-4"
              aria-labelledby="output-label"
            />
          )}
          {output && !error && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
              <span>Input: {input.length} chars</span>
              <span>Output: {output.length} chars</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
