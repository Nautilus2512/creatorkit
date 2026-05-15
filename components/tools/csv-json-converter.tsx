"use client"

import { useState, useEffect, useCallback } from "react"
import { FileSpreadsheet, FileJson, Upload, Download, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

const shortcuts = [
  { keys: ["1"], description: "CSV to JSON mode" },
  { keys: ["2"], description: "JSON to CSV mode" },
  { keys: ["Ctrl", "Shift", "U"], description: "Upload file" },
  { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download output" },
  { keys: ["Escape"], description: "Focus input" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between controls" },
]

export default function CsvJsonConverter() {
  const [csvInput, setCsvInput] = useState("")
  const [jsonInput, setJsonInput] = useState("")
  const [csvOutput, setCsvOutput] = useState("")
  const [jsonOutput, setJsonOutput] = useState("")
  const [mode, setMode] = useState<'csv-to-json' | 'json-to-csv'>('csv-to-json')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const hasOutput = mode === 'csv-to-json' ? !!jsonOutput : !!csvOutput

  const setModeWithAnnounce = useCallback((newMode: 'csv-to-json' | 'json-to-csv') => {
    setMode(newMode)
    announceToScreenReader(`Mode changed to ${newMode === 'csv-to-json' ? 'CSV to JSON' : 'JSON to CSV'}`)
  }, [])

  useEffect(() => {
    if (mode === 'csv-to-json' && csvInput) {
      convertCsvToJson()
      setActiveTab("output")
    } else if (mode === 'json-to-csv' && jsonInput) {
      convertJsonToCsv()
      setActiveTab("output")
    }
  }, [csvInput, jsonInput, mode])

  const convertCsvToJson = useCallback(() => {
    try {
      setError("")
      const lines = csvInput.trim().split('\n').filter(line => line.trim())
      if (lines.length === 0) { setJsonOutput(""); return }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((header, index) => { obj[header] = values[index] || '' })
        return obj
      })
      setJsonOutput(JSON.stringify(data, null, 2))
      announceToScreenReader(`Converted ${data.length} rows to JSON`)
    } catch {
      setError("Invalid CSV format")
      setJsonOutput("")
      announceToScreenReader("Error: Invalid CSV format")
    }
  }, [csvInput])

  const convertJsonToCsv = useCallback(() => {
    try {
      setError("")
      const data = JSON.parse(jsonInput)
      if (!Array.isArray(data)) {
        setError("JSON must be an array of objects")
        setCsvOutput("")
        announceToScreenReader("Error: JSON must be an array of objects")
        return
      }
      if (data.length === 0) { setCsvOutput(""); return }
      const headers = Object.keys(data[0])
      const csvLines = [headers.join(',')]
      data.forEach((obj: Record<string, unknown>) => {
        const values = headers.map(header => {
          const value = obj[header]
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        })
        csvLines.push(values.join(','))
      })
      setCsvOutput(csvLines.join('\n'))
      announceToScreenReader(`Converted ${data.length} objects to CSV`)
    } catch {
      setError("Invalid JSON format")
      setCsvOutput("")
      announceToScreenReader("Error: Invalid JSON format")
    }
  }, [jsonInput])

  const copyToClipboard = useCallback(() => {
    const textToCopy = mode === 'csv-to-json' ? jsonOutput : csvOutput
    if (!textToCopy) return
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    announceToScreenReader(`Copied ${mode === 'csv-to-json' ? 'JSON' : 'CSV'} to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }, [mode, jsonOutput, csvOutput])

  const downloadFile = useCallback(() => {
    const textToDownload = mode === 'csv-to-json' ? jsonOutput : csvOutput
    if (!textToDownload) return
    const filename = mode === 'csv-to-json' ? 'converted.json' : 'converted.csv'
    const mimeType = mode === 'csv-to-json' ? 'application/json' : 'text/csv'
    const blob = new Blob([textToDownload], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloading(true)
    announceToScreenReader(`Downloaded ${filename}`)
    setTimeout(() => setDownloading(false), 1500)
  }, [mode, jsonOutput, csvOutput])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) { announceToScreenReader("No file selected"); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (file.name.endsWith('.json')) {
        setJsonInput(content)
        setMode('json-to-csv')
        announceToScreenReader(`Uploaded ${file.name}. Switching to JSON to CSV mode`)
      } else if (file.name.endsWith('.csv')) {
        setCsvInput(content)
        setMode('csv-to-json')
        announceToScreenReader(`Uploaded ${file.name}. Switching to CSV to JSON mode`)
      } else {
        announceToScreenReader("Unsupported file type. Please upload CSV or JSON.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        const fileInput = document.getElementById("csv-json-upload") as HTMLInputElement
        fileInput?.click()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        const output = mode === 'csv-to-json' ? jsonOutput : csvOutput
        if (output) { e.preventDefault(); copyToClipboard() }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        const output = mode === 'csv-to-json' ? jsonOutput : csvOutput
        if (output) { e.preventDefault(); downloadFile() }
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "1" || e.key === "2")) {
        e.preventDefault()
        setModeWithAnnounce(e.key === "1" ? 'csv-to-json' : 'json-to-csv')
      }

      if (e.key === "Escape") {
        const textarea = document.getElementById("input-textarea") as HTMLTextAreaElement
        textarea?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode, jsonOutput, csvOutput, copyToClipboard, downloadFile, setModeWithAnnounce])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="CSV JSON Converter controls">
        <span className="text-sm font-semibold shrink-0 mr-1">CSV ↔ JSON Converter</span>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Conversion mode">
          <button
            onClick={() => setModeWithAnnounce('csv-to-json')}
            role="radio"
            aria-checked={mode === 'csv-to-json'}
            aria-label="CSV to JSON mode"
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'csv-to-json'
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />CSV→JSON
            <kbd
              className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
                mode === 'csv-to-json'
                  ? "border-primary-foreground/30 bg-primary-foreground/20"
                  : "border-border bg-muted"
              }`}
              aria-hidden="true"
            >
              1
            </kbd>
          </button>
          <button
            onClick={() => setModeWithAnnounce('json-to-csv')}
            role="radio"
            aria-checked={mode === 'json-to-csv'}
            aria-label="JSON to CSV mode"
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'json-to-csv'
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            <FileJson className="h-3 w-3" aria-hidden="true" />JSON→CSV
            <kbd
              className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
                mode === 'json-to-csv'
                  ? "border-primary-foreground/30 bg-primary-foreground/20"
                  : "border-border bg-muted"
              }`}
              aria-hidden="true"
            >
              2
            </kbd>
          </button>
        </div>
        <input
          type="file"
          id="csv-json-upload"
          accept=".csv,.json"
          className="hidden"
          onChange={handleFileUpload}
          aria-label="Upload CSV or JSON file"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (document.getElementById("csv-json-upload") as HTMLInputElement)?.click()}
          aria-label="Upload CSV or JSON file"
        >
          <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="CSV ↔ JSON Converter" shortcuts={shortcuts} />
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            disabled={!hasOutput}
            aria-label={copied ? "Copied to clipboard" : "Copy output"}
          >
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
          <Button
            variant={downloading ? "outline" : "default"}
            size="sm"
            onClick={downloadFile}
            disabled={!hasOutput}
            aria-label="Download output file"
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
            <kbd
              className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
                downloading
                  ? "border-border bg-muted"
                  : "border-primary-foreground/30 bg-primary-foreground/20"
              }`}
              aria-hidden="true"
            >
              Ctrl+Shift+S
            </kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">CSV ↔ JSON</h2>
          <ShortcutsModal pageName="CSV ↔ JSON Converter" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Input
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Output
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* PANELS CARD */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Input panel */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden md:border-r border-border`}
            role="region"
            aria-label="Input panel"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">{mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}</span>
            </div>
            <Textarea
              id="input-textarea"
              value={mode === 'csv-to-json' ? csvInput : jsonInput}
              onChange={(e) => {
                if (mode === 'csv-to-json') { setCsvInput(e.target.value) }
                else { setJsonInput(e.target.value) }
              }}
              placeholder={mode === 'csv-to-json'
                ? "Paste CSV here...\nname,age,city\nAlice,30,Paris"
                : "Paste JSON array here...\n[{\"name\": \"Alice\", \"age\": 30}]"
              }
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm p-4 focus-visible:ring-0"
              spellCheck={false}
              aria-label={mode === 'csv-to-json' ? 'CSV input' : 'JSON input'}
            />
          </div>

          {/* Output panel */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden`}
            role="region"
            aria-label="Output panel"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">{mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}</span>
            </div>
            {error ? (
              <div className="flex-1 flex items-center justify-center p-6" role="alert" aria-live="assertive">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              </div>
            ) : (
              <Textarea
                id="output-textarea"
                value={mode === 'csv-to-json' ? jsonOutput : csvOutput}
                readOnly
                placeholder="Output will appear here automatically..."
                className="flex-1 resize-none border-0 rounded-none font-mono text-sm p-4 bg-muted/10 focus-visible:ring-0"
                spellCheck={false}
                aria-label={mode === 'csv-to-json' ? 'JSON output' : 'CSV output'}
                aria-live="polite"
                aria-atomic="true"
              />
            )}
          </div>

        </div>

        {/* USAGE GUIDE */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Choose a direction: <span className="text-foreground font-medium">CSV→JSON</span> or <span className="text-foreground font-medium">JSON→CSV</span> using the buttons in the toolbar, or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> or <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd>.</li>
              <li>Paste your data into the <span className="text-foreground font-medium">Input</span> panel, or click <span className="text-foreground font-medium">Upload</span> to load a .csv or .json file directly. The output updates automatically as you type.</li>
              <li>Click <span className="text-foreground font-medium">Copy</span> to copy the result to your clipboard, or <span className="text-foreground font-medium">Download</span> to save it as a file.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> switches to CSV to JSON. <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> switches to JSON to CSV.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> opens the file picker to upload a .csv or .json file.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copies the converted output to your clipboard.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd> downloads the result as a file.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Escape</kbd> moves focus to the input so you can type or paste immediately.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Format notes</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>CSV input must have a <span className="text-foreground font-medium">header row</span> as the first line. Each subsequent line becomes one JSON object.</li>
              <li>JSON input must be an <span className="text-foreground font-medium">array of objects</span>. The keys of the first object become the CSV column headers.</li>
              <li>Values containing commas are automatically <span className="text-foreground font-medium">quoted</span> in the CSV output.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
        </div>

        {/* Spacer so fixed mobile bar does not cover last content */}
        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Conversion mode">
          <button
            onClick={() => setModeWithAnnounce('csv-to-json')}
            role="radio"
            aria-checked={mode === 'csv-to-json'}
            aria-label="CSV to JSON mode"
            className={`h-11 px-3 text-xs rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'csv-to-json'
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            CSV→JSON
          </button>
          <button
            onClick={() => setModeWithAnnounce('json-to-csv')}
            role="radio"
            aria-checked={mode === 'json-to-csv'}
            aria-label="JSON to CSV mode"
            className={`h-11 px-3 text-xs rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'json-to-csv'
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            JSON→CSV
          </button>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-11 px-3"
          onClick={copyToClipboard}
          disabled={!hasOutput}
          aria-label={copied ? "Copied to clipboard" : "Copy output"}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
        </Button>
        <Button
          size="sm"
          className="h-11 px-3"
          onClick={downloadFile}
          disabled={!hasOutput}
          aria-label="Download output file"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1 text-xs">Save</span>
        </Button>
      </div>

    </div>
  )
}
