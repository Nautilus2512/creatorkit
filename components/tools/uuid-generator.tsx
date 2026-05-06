"use client"

import { useState, useEffect } from "react"
import { 
  Hash, Copy, Download, Check, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>([])
  const [singleUuid, setSingleUuid] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [bulkCount, setBulkCount] = useState(1)
  const [includeHyphens, setIncludeHyphens] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateUuid = () => {
    const uuid = crypto.randomUUID()
    setSingleUuid(uuid)
    setCopied('single')
    setTimeout(() => setCopied(null), 2000)
  }

  const generateBulkUuids = () => {
    setIsGenerating(true)
    const newUuids = Array.from({ length: bulkCount }, () => {
      let uuid = crypto.randomUUID()
      if (!includeHyphens) {
        uuid = uuid.replace(/-/g, '')
      }
      return uuid
    })

    setTimeout(() => {
      setUuids(newUuids)
      setIsGenerating(false)
      setCopied('bulk')
      setTimeout(() => setCopied(null), 2000)
    }, 500)
  }

  const copyToClipboard = (text: string, type: 'single' | 'bulk' | 'all') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyAllToClipboard = () => {
    const allUuids = uuids.join('\n')
    copyToClipboard(allUuids, 'all')
  }

  const downloadAllAsFile = () => {
    const allUuids = uuids.join('\n')
    downloadAsFile(allUuids, 'uuids.txt')
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">UUID Generator</h1>
            <p className="text-sm text-muted-foreground">Generate cryptographically secure UUID v4s</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateUuid}
            >
              <Hash className="h-4 w-4 mr-1" />
              Generate Single
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 border-b border-border bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-4 space-y-4">
          {/* Single UUID */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Single UUID
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
        <div className="space-y-2">
                <Textarea
                  value={singleUuid}
                  onChange={(e) => setSingleUuid(e.target.value)}
                  placeholder="Generated UUID will appear here..."
                  className="font-mono text-sm"
                  readOnly
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(singleUuid, 'single')}
                  disabled={!singleUuid}
                  className="w-full"
                >
                  {copied === 'single' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copy
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateUuid}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Generate New
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Bulk Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Bulk Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Label htmlFor="bulk-count" className="text-sm font-medium">
                    Number of UUIDs
                  </Label>
                  <input
                    id="bulk-count"
                    type="number"
                    min="1"
                    max="100"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border rounded-md font-mono text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-hyphens"
                      checked={includeHyphens}
                      onCheckedChange={setIncludeHyphens}
                    />
                    <Label htmlFor="include-hyphens" className="text-sm">
                      Include hyphens
                    </Label>
                  </div>
                </div>

                </div>

              {uuids.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Generated UUIDs ({uuids.length})</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyAllToClipboard}
                        disabled={uuids.length === 0}
                      >
                        {copied === 'all' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        Copy All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadAllAsFile}
                        disabled={uuids.length === 0}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download All
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-md bg-muted/20 p-3">
                    <div className="font-mono text-sm space-y-1">
                      {uuids.map((uuid, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          <span>{uuid}</span>
            </div>

            {uuids.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Generated UUIDs ({uuids.length})</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyAllToClipboard}
                      disabled={uuids.length === 0}
                    >
                      {copied === 'all' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAllAsFile}
                      disabled={uuids.length === 0}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download All
                    </Button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md bg-muted/20 p-3">
                  <div className="font-mono text-sm space-y-1">
                    {uuids.map((uuid, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">#{index + 1}</span>
                        <span>{uuid}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Status Bar */}
    {copied && (
      <div className="shrink-0 border-b border-border bg-muted/30">
        <div className="px-6 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 mr-1" />
          {copied === 'single' ? 'Single UUID copied!' : 
           copied === 'bulk' ? `${uuids.length} UUIDs copied!` : 
           copied === 'all' ? 'All UUIDs copied!' : 'Copied!'}
        </div>
      </div>
    )}
  </div>
)