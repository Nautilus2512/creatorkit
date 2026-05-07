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
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">CSV ↔ JSON Converter</h1>
            <p className="text-sm text-muted-foreground">Convert between CSV and JSON formats</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-1" />
                Upload File
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={!csvOutput && !jsonOutput}
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadFile}
              disabled={!csvOutput && !jsonOutput}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="shrink-0 border-b border-border bg-muted/30">
        <div className="px-6 py-3 flex items-center justify-center gap-4">
          <Button
            variant={mode === 'csv-to-json' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('csv-to-json')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV to JSON
          </Button>
          <Button
            variant={mode === 'json-to-csv' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('json-to-csv')}
          >
            <FileJson className="h-4 w-4 mr-1" />
            JSON to CSV
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="shrink-0 border-b border-border bg-destructive/10">
          <div className="px-6 py-2 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {mode === 'csv-to-json' ? (
          <>
            {/* Left Panel - CSV Input */}
            <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
              <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV Input
                </h3>
                <Badge variant="outline" className="text-xs">
                  {csvInput.split('\n').filter(line => line.trim()).length} rows
                </Badge>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <Textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="Enter CSV data (comma-separated values)..."
                  className="h-full w-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Right Panel - JSON Output */}
            <div className="flex flex-col md:w-1/2 md:flex-1">
              <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON Output
                </h3>
                {jsonOutput && (
                  <Badge variant="outline" className="text-xs">
                    {JSON.parse(jsonOutput || '[]').length} objects
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden">
                {jsonOutput ? (
                  <Textarea
                    value={jsonOutput}
                    readOnly
                    className="h-full w-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4 bg-muted/20"
                    spellCheck={false}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <FileJson className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-center">Enter CSV to see JSON output</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left Panel - JSON Input */}
            <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
              <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON Input
                </h3>
                {jsonInput && (
                  <Badge variant="outline" className="text-xs">
                    {JSON.parse(jsonInput || '[]').length} objects
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden">
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Enter JSON array (e.g., [{'name': 'John', 'age': 30}])..."
                  className="h-full w-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Right Panel - CSV Output */}
            <div className="flex flex-col md:w-1/2 md:flex-1">
              <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV Output
                </h3>
                {csvOutput && (
                  <Badge variant="outline" className="text-xs">
                    {csvOutput.split('\n').filter(line => line.trim()).length} rows
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden">
                {csvOutput ? (
                  <Textarea
                    value={csvOutput}
                    readOnly
                    className="h-full w-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4 bg-muted/20"
                    spellCheck={false}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-center">Enter JSON to see CSV output</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}