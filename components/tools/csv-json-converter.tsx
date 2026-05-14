"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  FileSpreadsheet, FileJson, Upload, Download, Copy, Check, 
  ArrowRightLeft, ArrowBigRight, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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

export default function CsvJsonConverter() {
  const [csvInput, setCsvInput] = useState("")
  const [jsonInput, setJsonInput] = useState("")
  const [csvOutput, setCsvOutput] = useState("")
  const [jsonOutput, setJsonOutput] = useState("")
  const [mode, setMode] = useState<'csv-to-json' | 'json-to-csv'>('csv-to-json')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

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
      if (lines.length === 0) {
        setJsonOutput("")
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ''
        })
        return obj
      })

      const json = JSON.stringify(data, null, 2)
      setJsonOutput(json)
      announceToScreenReader(`Converted ${data.length} rows to JSON`)
    } catch (err) {
      setError("Invalid CSV format")
      setJsonOutput("")
      announceToScreenReader('Error: Invalid CSV format')
    }
  }, [csvInput])

  const convertJsonToCsv = useCallback(() => {
    try {
      setError("")
      const data = JSON.parse(jsonInput)
      if (!Array.isArray(data)) {
        setError("JSON must be an array of objects")
        setCsvOutput("")
        announceToScreenReader('Error: JSON must be an array of objects')
        return
      }

      if (data.length === 0) {
        setCsvOutput("")
        return
      }

      const headers = Object.keys(data[0])
      const csvLines = [headers.join(',')]

      data.forEach(obj => {
        const values = headers.map(header => {
          const value = obj[header]
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        })
        csvLines.push(values.join(','))
      })

      setCsvOutput(csvLines.join('\n'))
      announceToScreenReader(`Converted ${data.length} objects to CSV`)
    } catch (err) {
      setError("Invalid JSON format")
      setCsvOutput("")
      announceToScreenReader('Error: Invalid JSON format')
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
    announceToScreenReader(`Downloaded ${filename}`)
  }, [mode, jsonOutput, csvOutput])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      announceToScreenReader('No file selected')
      return
    }

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
        announceToScreenReader('Unsupported file type. Please upload CSV or JSON.')
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) {
        // Ctrl+Shift+C to copy output when in textarea
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
          const output = mode === 'csv-to-json' ? jsonOutput : csvOutput
          if (output && document.activeElement?.id !== 'output-textarea') {
            e.preventDefault()
            e.stopPropagation()
            copyToClipboard()
          }
        }
        return
      }
      
      // Tab to switch mode
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setModeWithAnnounce(mode === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json')
      }
      
      // Ctrl+Shift+O to upload
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        e.stopPropagation()
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        fileInput?.click()
      }
      
      // Ctrl+Shift+C to copy output
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        const output = mode === 'csv-to-json' ? jsonOutput : csvOutput
        if (output) {
          e.preventDefault()
          e.stopPropagation()
          copyToClipboard()
        }
      }
      
      // Ctrl+Shift+S to download
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        const output = mode === 'csv-to-json' ? jsonOutput : csvOutput
        if (output) {
          e.preventDefault()
          e.stopPropagation()
          downloadFile()
        }
      }
      
      // 1 and 2 to switch modes
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "1" || e.key === "2")) {
        e.preventDefault()
        const newMode = e.key === "1" ? 'csv-to-json' : 'json-to-csv'
        setModeWithAnnounce(newMode)
      }
      
      // Escape to focus input
      if (e.key === "Escape") {
        const textarea = document.getElementById('input-textarea') as HTMLTextAreaElement
        textarea?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [mode, jsonOutput, csvOutput, copyToClipboard, downloadFile, setModeWithAnnounce])

  return (
    <div className="flex h-full flex-col">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 flex-wrap border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">CSV ↔ JSON Converter</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Conversion mode">
          <button onClick={() => setModeWithAnnounce('csv-to-json')} role="radio" aria-checked={mode === 'csv-to-json'}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${mode === 'csv-to-json' ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />CSV→JSON <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">1</kbd>
          </button>
          <button onClick={() => setModeWithAnnounce('json-to-csv')} role="radio" aria-checked={mode === 'json-to-csv'}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${mode === 'json-to-csv' ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            <FileJson className="h-3 w-3" aria-hidden="true" />JSON→CSV <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">2</kbd>
          </button>
        </div>
        <label className="cursor-pointer">
          <input type="file" id="file-upload" accept=".csv,.json" onChange={handleFileUpload} className="hidden" aria-label="Upload CSV or JSON file" />
          <Button variant="outline" size="sm" asChild aria-label="Upload file">
            <span className="flex items-center gap-1"><Upload className="h-3 w-3" aria-hidden="true" />Upload <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+O</kbd></span>
          </Button>
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="CSV ↔ JSON Converter" shortcuts={[
            { keys: ["1"], description: "CSV to JSON mode" },
            { keys: ["2"], description: "JSON to CSV mode" },
            { keys: ["Tab"], description: "Switch mode" },
            { keys: ["Ctrl", "Shift", "O"], description: "Upload file" },
            { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
            { keys: ["Ctrl", "Shift", "S"], description: "Download output" },
          ]} />
          <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!(mode === 'csv-to-json' ? jsonOutput : csvOutput)} aria-label="Copy output">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadFile} disabled={!(mode === 'csv-to-json' ? jsonOutput : csvOutput)} aria-label="Download output">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">CSV ↔ JSON</h2>
          <ShortcutsModal pageName="CSV ↔ JSON Converter" shortcuts={[
            { keys: ["1"], description: "CSV to JSON" },
            { keys: ["2"], description: "JSON to CSV" },
            { keys: ["Ctrl", "Shift", "C"], description: "Copy output" },
          ]} />
        </div>
        <div className="flex" role="tablist">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Input
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Output
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel — Input */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Input panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">{mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}</span>
          </div>
          <Textarea
            id="input-textarea"
            value={mode === 'csv-to-json' ? csvInput : jsonInput}
            onChange={(e) => { if (mode === 'csv-to-json') { setCsvInput(e.target.value) } else { setJsonInput(e.target.value) } }}
            placeholder={mode === 'csv-to-json' ? "Paste CSV here...\nname,age,city\nAlice,30,Paris" : "Paste JSON array here...\n[{\"name\": \"Alice\", \"age\": 30}]"}
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm p-4 focus-visible:ring-0"
            spellCheck={false}
            aria-label={mode === 'csv-to-json' ? 'CSV input' : 'JSON input'}
          />
        </div>

        {/* Right Panel — Output */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Output panel">
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

      {/* Mobile: bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setModeWithAnnounce('csv-to-json')}
            className={`h-11 px-3 text-xs rounded-md border ${mode === 'csv-to-json' ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            CSV→JSON
          </button>
          <button onClick={() => setModeWithAnnounce('json-to-csv')}
            className={`h-11 px-3 text-xs rounded-md border ${mode === 'json-to-csv' ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            JSON→CSV
          </button>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-4" onClick={copyToClipboard} disabled={!(mode === 'csv-to-json' ? jsonOutput : csvOutput)} aria-label="Copy output">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  )
}