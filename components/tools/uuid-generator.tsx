"use client"

import { useState } from "react"
import { Hash, Copy, Download, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function UuidGenerator() {
  const [singleUuid, setSingleUuid] = useState("")
  const [uuids, setUuids] = useState<string[]>([])
  const [bulkCount, setBulkCount] = useState(10)
  const [includeHyphens, setIncludeHyphens] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const makeUuid = () => {
    const uuid = crypto.randomUUID()
    return includeHyphens ? uuid : uuid.replace(/-/g, "")
  }

  const generateSingle = () => {
    setSingleUuid(makeUuid())
  }

  const generateBulk = () => {
    setUuids(Array.from({ length: bulkCount }, makeUuid))
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const download = () => {
    const content = uuids.join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "uuids.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">UUID Generator</h1>
            <p className="text-sm text-muted-foreground">Generate cryptographically secure UUID v4s</p>
          </div>
          <Button variant="outline" size="sm" onClick={generateSingle}>
            <Hash className="h-4 w-4 mr-1" />Generate Single
          </Button>
        </div>
      </div>

      {/* Options */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="hyphens" checked={includeHyphens} onCheckedChange={setIncludeHyphens} />
          <Label htmlFor="hyphens" className="text-sm">Include hyphens</Label>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Single */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Single UUID</h3>
          </div>
          <div className="p-6 space-y-4">
            <Textarea
              value={singleUuid}
              readOnly
              placeholder="Click Generate Single to create a UUID..."
              className="font-mono text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateSingle} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-1" />Generate New
              </Button>
              <Button variant="outline" size="sm" onClick={() => copy(singleUuid, "single")} disabled={!singleUuid}>
                {copied === "single" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied === "single" ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right — Bulk */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-medium">Bulk Generation</h3>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Count:</Label>
              <input
                type="number"
                min={1}
                max={1000}
                value={bulkCount}
                onChange={(e) => setBulkCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 border border-border rounded text-xs font-mono bg-background"
              />
            </div>
          </div>

          <div className="p-4 flex gap-2 border-b border-border">
            <Button size="sm" onClick={generateBulk} className="flex-1">
              <Hash className="h-4 w-4 mr-1" />Generate {bulkCount} UUIDs
            </Button>
            {uuids.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => copy(uuids.join("\n"), "all")}>
                  {copied === "all" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copy All
                </Button>
                <Button variant="outline" size="sm" onClick={download}>
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {uuids.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Click Generate to create bulk UUIDs
              </div>
            ) : (
              <div className="divide-y divide-border">
                {uuids.map((uuid, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 group">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">#{i + 1}</span>
                    <span className="font-mono text-xs flex-1 truncate">{uuid}</span>
                    <Button
                      variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => copy(uuid, `row-${i}`)}
                    >
                      {copied === `row-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {uuids.length > 0 && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground">
          {uuids.length} UUIDs generated · {includeHyphens ? "with hyphens" : "no hyphens"}
        </div>
      )}
    </div>
  )
}
