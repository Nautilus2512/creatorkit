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

  const setModeWithAnnounce = useCallback((newMode: 'csv-to-json' | 'json-to-csv') => {
    setMode(newMode)
    announceToScreenReader(`Mode changed to ${newMode === 'csv-to-json' ? 'CSV to JSON' : 'JSON to CSV'}`)
  }, [])

  useEffect(() => {
    if (mode === 'csv-to-json' && csvInput) {
      convertCsvToJson()
    } else if (mode === 'json-to-csv' && jsonInput) {
      convertJsonToCsv()
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
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-2" role="banner">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" id="converter-title">CSV ↔ JSON Converter</h2>
          <p className="text-muted-foreground" id="converter-description">Convert between CSV and JSON formats. Press Tab to switch mode, Ctrl+O to upload, Ctrl+C to copy, Ctrl+S to download. Press ? for shortcuts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={mode === 'csv-to-json' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setModeWithAnnounce('csv-to-json')}
            role="radio"
            aria-checked={mode === 'csv-to-json'}
            aria-label="CSV to JSON mode (press 1)"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" aria-hidden="true" />CSV to JSON<kbd className="ml-2 rounded border border-border bg-background px-1 text-[10px] text-foreground" aria-hidden="true">1</kbd>
          </Button>
          <Button 
            variant={mode === 'json-to-csv' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setModeWithAnnounce('json-to-csv')}
            role="radio"
            aria-checked={mode === 'json-to-csv'}
            aria-label="JSON to CSV mode (press 2)"
          >
            <FileJson className="h-4 w-4 mr-1" aria-hidden="true" />JSON to CSV<kbd className="ml-2 rounded border border-border bg-background px-1 text-[10px] text-foreground" aria-hidden="true">2</kbd>
          </Button>
          <div className="h-4 w-px bg-border" role="separator" aria-hidden="true" />
          <>
            <input 
              type="file" 
              id="file-upload"
              accept=".csv,.json" 
              onChange={handleFileUpload} 
              className="hidden" 
              aria-label="Upload CSV or JSON file"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const fileInput = document.getElementById('file-upload') as HTMLInputElement
                fileInput?.click()
              }}
              aria-label="Upload CSV or JSON file"
            >
              <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload<kbd className="ml-2 rounded border border-border bg-background px-1 text-[10px] text-foreground" aria-hidden="true">Ctrl+O</kbd>
            </Button>
          </>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard} 
            disabled={!csvOutput && !jsonOutput}
            aria-label="Copy converted output"
          >
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}{(csvOutput || jsonOutput) && <kbd className="ml-2 rounded border border-border bg-background px-1 text-[10px] text-foreground" aria-hidden="true">Ctrl+C</kbd>}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadFile} 
            disabled={!csvOutput && !jsonOutput}
            aria-label="Download converted file"
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download{(csvOutput || jsonOutput) && <kbd className="ml-2 rounded border border-border bg-background px-1 text-[10px] text-foreground" aria-hidden="true">Ctrl+S</kbd>}
          </Button>
        </div>
      </div>

      {error && (
        <div 
          className="flex items-center gap-2 text-destructive text-sm rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card h-full" role="region" aria-label={mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}>
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              {mode === 'csv-to-json' ? <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> : <FileJson className="h-4 w-4" aria-hidden="true" />}
              {mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
            </span>
            <Badge 
              variant="outline" 
              className="text-xs"
              role="status"
              aria-live="polite"
              aria-label={mode === 'csv-to-json' ? `${csvInput.split('\n').filter(l => l.trim()).length} rows` : `${(() => { try { return JSON.parse(jsonInput || '[]').length } catch { return 0 } })()} objects`}
            >
              {mode === 'csv-to-json'
                ? `${csvInput.split('\n').filter(l => l.trim()).length} rows`
                : jsonInput ? `${(() => { try { return JSON.parse(jsonInput || '[]').length } catch { return 0 } })()} objects` : ''}
            </Badge>
          </div>
          <Textarea
            id="input-textarea"
            value={mode === 'csv-to-json' ? csvInput : jsonInput}
            onChange={(e) => mode === 'csv-to-json' ? setCsvInput(e.target.value) : setJsonInput(e.target.value)}
            placeholder={mode === 'csv-to-json' ? "Enter CSV data (comma-separated values)..." : "Enter JSON array..."}
            className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4"
            spellCheck={false}
            aria-label={mode === 'csv-to-json' ? 'CSV input data' : 'JSON input array'}
          />
        </div>

        {/* Right Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card h-full" role="region" aria-label={mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}>
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              {mode === 'csv-to-json' ? <FileJson className="h-4 w-4" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
              {mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
            </span>
            {(mode === 'csv-to-json' ? jsonOutput : csvOutput) && (
              <Badge 
                variant="outline" 
                className="text-xs"
                role="status"
                aria-live="polite"
              >
                Ready to copy
              </Badge>
            )}
          </div>
          {(mode === 'csv-to-json' ? jsonOutput : csvOutput) ? (
            <Textarea
              id="output-textarea"
              value={mode === 'csv-to-json' ? jsonOutput : csvOutput}
              readOnly
              className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4 bg-muted/10"
              spellCheck={false}
              aria-label={mode === 'csv-to-json' ? 'Converted JSON output' : 'Converted CSV output'}
              aria-live="polite"
              aria-atomic="true"
            />
          ) : (
            <div 
              className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2"
              role="note"
            >
              {mode === 'csv-to-json' ? <FileJson className="h-12 w-12 opacity-30" aria-hidden="true" /> : <FileSpreadsheet className="h-12 w-12 opacity-30" aria-hidden="true" />}
              <p className="text-sm">{mode === 'csv-to-json' ? 'Enter CSV to see JSON output' : 'Enter JSON to see CSV output'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="CSV JSON Converter"
      shortcuts={[
        { keys: ["1"], description: "CSV to JSON mode" },
        { keys: ["2"], description: "JSON to CSV mode" },
        { keys: ["Tab"], description: "Switch conversion mode" },
        { keys: ["Ctrl", "O"], description: "Upload file" },
        { keys: ["Ctrl", "C"], description: "Copy converted output" },
        { keys: ["Ctrl", "S"], description: "Download file" },
        { keys: ["Escape"], description: "Focus input textarea" },
        { keys: ["?"], description: "Toggle this shortcuts panel" },
      ]}
    />
    </>
  )
}