"use client"

import { useState } from "react"
import yaml from "js-yaml"
import { Copy, Check, ArrowLeftRight, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setInput("")
    output = ""
  }

  const swap = () => {
    const newMode: Mode = mode === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json"
    setMode(newMode)
    setInput(output)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const ext = mode === "yaml-to-json" ? "json" : "yaml"
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `output.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setInput(reader.result as string)
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">YAML ↔ JSON Converter</h1>
            <p className="text-sm text-muted-foreground">Convert between YAML and JSON formats. Runs entirely in your browser.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={mode === "yaml-to-json" ? "default" : "outline"} size="sm" onClick={() => switchMode("yaml-to-json")}>
              YAML → JSON
            </Button>
            <Button variant={mode === "json-to-yaml" ? "default" : "outline"} size="sm" onClick={() => switchMode("json-to-yaml")}>
              JSON → YAML
            </Button>
            <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
              <ArrowLeftRight className="h-4 w-4 mr-1" />Swap
            </Button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-2 flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Indent:</span>
        {[2, 4].map(n => (
          <button
            key={n}
            onClick={() => setIndent(n)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${indent === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            {n} spaces
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "yaml-to-json" ? "YAML Input" : "JSON Input"}</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setInput(mode === "yaml-to-json" ? EXAMPLE_YAML : EXAMPLE_JSON)}>
                Example
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".yaml,.yml,.json" className="hidden" onChange={handleFile} />
                <Button variant="ghost" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Upload</span>
                </Button>
              </label>
            </div>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "yaml-to-json" ? "name: John\nage: 30\nhobbies:\n  - reading" : '{\n  "name": "John",\n  "age": 30\n}'}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0"
          />
        </div>

        {/* Right */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "yaml-to-json" ? "JSON Output" : "YAML Output"}</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={download} disabled={!output}>
                <Download className="h-4 w-4 mr-1" />Download
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex-1 p-4">
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
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 bg-muted/10"
            />
          )}
        </div>
      </div>

      {output && !error && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
          <span>Input: {input.length} chars</span>
          <span>Output: {output.length} chars</span>
        </div>
      )}
    </div>
  )
}
