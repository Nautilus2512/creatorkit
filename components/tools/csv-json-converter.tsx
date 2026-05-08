"use client"

import { useState, useEffect } from "react"
import { 
  FileSpreadsheet, FileJson, Upload, Download, Copy, Check, 
  ArrowRightLeft, ArrowBigRight, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function CsvJsonConverter() {
  const [csvInput, setCsvInput] = useState("")
  const [jsonInput, setJsonInput] = useState("")
  const [csvOutput, setCsvOutput] = useState("")
  const [jsonOutput, setJsonOutput] = useState("")
  const [mode, setMode] = useState<'csv-to-json' | 'json-to-csv'>('csv-to-json')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (mode === 'csv-to-json' && csvInput) {
      convertCsvToJson()
    } else if (mode === 'json-to-csv' && jsonInput) {
      convertJsonToCsv()
    }
  }, [csvInput, jsonInput, mode])

  const convertCsvToJson = () => {
    try {
      setError("")
      const lines = csvInput.trim().split('\n').filter(line => line.trim())
      if (lines.length === 0) return

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
    } catch (err) {
      setError("Invalid CSV format")
      setJsonOutput("")
    }
  }

  const convertJsonToCsv = () => {
    try {
      setError("")
      const data = JSON.parse(jsonInput)
      if (!Array.isArray(data)) {
        setError("JSON must be an array of objects")
        setCsvOutput("")
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
    } catch (err) {
      setError("Invalid JSON format")
      setCsvOutput("")
    }
  }

  const copyToClipboard = () => {
    const textToCopy = mode === 'csv-to-json' ? jsonOutput : csvOutput
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const textToDownload = mode === 'csv-to-json' ? jsonOutput : csvOutput
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
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (file.name.endsWith('.json')) {
        setJsonInput(content)
        setMode('json-to-csv')
      } else if (file.name.endsWith('.csv')) {
        setCsvInput(content)
        setMode('csv-to-json')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">CSV ↔ JSON Converter</h2>
          <p className="text-muted-foreground">Convert between CSV and JSON formats</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={mode === 'csv-to-json' ? 'default' : 'outline'} size="sm" onClick={() => setMode('csv-to-json')}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />CSV to JSON
          </Button>
          <Button variant={mode === 'json-to-csv' ? 'default' : 'outline'} size="sm" onClick={() => setMode('json-to-csv')}>
            <FileJson className="h-4 w-4 mr-1" />JSON to CSV
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-1" />Upload
              <input type="file" accept=".csv,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!csvOutput && !jsonOutput}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}Copy
          </Button>
          <Button variant="outline" size="sm" onClick={downloadFile} disabled={!csvOutput && !jsonOutput}>
            <Download className="h-4 w-4 mr-1" />Download
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              {mode === 'csv-to-json' ? <FileSpreadsheet className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
              {mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
            </span>
            <Badge variant="outline" className="text-xs">
              {mode === 'csv-to-json'
                ? `${csvInput.split('\n').filter(l => l.trim()).length} rows`
                : jsonInput ? `${(() => { try { return JSON.parse(jsonInput || '[]').length } catch { return 0 } })()} objects` : ''}
            </Badge>
          </div>
          <Textarea
            value={mode === 'csv-to-json' ? csvInput : jsonInput}
            onChange={(e) => mode === 'csv-to-json' ? setCsvInput(e.target.value) : setJsonInput(e.target.value)}
            placeholder={mode === 'csv-to-json' ? "Enter CSV data (comma-separated values)..." : "Enter JSON array..."}
            className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4"
            spellCheck={false}
          />
        </div>

        {/* Right Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              {mode === 'csv-to-json' ? <FileJson className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
              {mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
            </span>
          </div>
          {(mode === 'csv-to-json' ? jsonOutput : csvOutput) ? (
            <Textarea
              value={mode === 'csv-to-json' ? jsonOutput : csvOutput}
              readOnly
              className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4 bg-muted/10"
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              {mode === 'csv-to-json' ? <FileJson className="h-12 w-12 opacity-30" /> : <FileSpreadsheet className="h-12 w-12 opacity-30" />}
              <p className="text-sm">{mode === 'csv-to-json' ? 'Enter CSV to see JSON output' : 'Enter JSON to see CSV output'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}