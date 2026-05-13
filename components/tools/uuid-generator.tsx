"use client"

import { useState, useCallback, useEffect } from "react"
import { Hash, Copy, Download, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

export default function UuidGenerator() {
  const [singleUuid, setSingleUuid] = useState("")
  const [uuids, setUuids] = useState<string[]>([])
  const [bulkCount, setBulkCount] = useState(10)
  const [includeHyphens, setIncludeHyphens] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const makeUuid = useCallback(() => {
    const uuid = crypto.randomUUID()
    return includeHyphens ? uuid : uuid.replace(/-/g, "")
  }, [includeHyphens])

  const generateSingle = useCallback(() => {
    setSingleUuid(makeUuid())
    announceToScreenReader("Single UUID generated")
  }, [makeUuid, announceToScreenReader])

  const generateBulk = useCallback(() => {
    setUuids(Array.from({ length: bulkCount }, makeUuid))
    announceToScreenReader(`${bulkCount} UUIDs generated`)
  }, [bulkCount, makeUuid, announceToScreenReader])

  const copy = useCallback((text: string, key: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(key)
    announceToScreenReader("Copied to clipboard")
    setTimeout(() => setCopied(null), 2000)
  }, [announceToScreenReader])

  const download = useCallback(() => {
    if (uuids.length === 0) return
    const blob = new Blob([uuids.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "uuids.txt"
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("UUIDs downloaded")
  }, [uuids, announceToScreenReader])

  const toggleHyphens = useCallback(() => {
    setIncludeHyphens(prev => {
      const newValue = !prev
      announceToScreenReader(`Hyphens ${newValue ? "enabled" : "disabled"}`)
      return newValue
    })
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "g":
            e.preventDefault()
            generateSingle()
            break
          case "b":
            e.preventDefault()
            generateBulk()
            break
          case "c":
            if (singleUuid) {
              e.preventDefault()
              copy(singleUuid, "single")
            } else if (uuids.length > 0) {
              e.preventDefault()
              copy(uuids.join("\n"), "all")
            }
            break
          case "d":
            if (uuids.length > 0) {
              e.preventDefault()
              download()
            }
            break
          case "h":
            e.preventDefault()
            toggleHyphens()
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [singleUuid, uuids, copy, download, generateSingle, generateBulk, toggleHyphens])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "G"], description: "Generate single UUID" },
    { keys: ["Ctrl", "Shift", "B"], description: "Generate bulk UUIDs" },
    { keys: ["Ctrl", "Shift", "C"], description: "Copy selected UUID" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download UUIDs" },
    { keys: ["Ctrl", "Shift", "H"], description: "Toggle hyphens" },
  ]

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">UUID Generator</h2>
          <p className="text-muted-foreground">Generate cryptographically secure UUID v4s</p>
        </div>
        <ShortcutsModal pageName="UUID Generator" shortcuts={shortcuts} />
      </div>

      <div className="flex items-center gap-4" role="group" aria-label="UUID generation options">
        <div className="flex items-center gap-2">
          <Switch 
            id="hyphens" 
            checked={includeHyphens} 
            onCheckedChange={setIncludeHyphens}
            aria-label="Include hyphens in UUID"
          />
          <Label htmlFor="hyphens" className="text-sm">Include hyphens</Label>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>H</span>
          </kbd>
        </div>
        <Button 
          size="sm" 
          onClick={generateSingle}
          aria-label="Generate single UUID"
          className="focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Generate Single</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>G</span>
          </kbd>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left — Single UUID */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Single UUID panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Single UUID</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Textarea
              value={singleUuid}
              readOnly
              placeholder="Click Generate Single to create a UUID..."
              className="font-mono text-sm resize-none"
              rows={3}
              aria-label="Generated single UUID"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateSingle} className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary/50">
                <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
                <span>Generate New</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copy(singleUuid, "single")} 
                disabled={!singleUuid}
                aria-label={copied === "single" ? "Copied to clipboard" : "Copy single UUID"}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {copied === "single" ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                <span>{copied === "single" ? "Copied!" : "Copy"}</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                  <span>Ctrl</span><span>Shift</span><span>C</span>
                </kbd>
              </Button>
            </div>
          </div>
        </div>

        {/* Right — Bulk Generation */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Bulk UUID generation panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Bulk Generation</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="bulk-count" className="text-xs text-muted-foreground">Count:</Label>
              <input
                id="bulk-count"
                type="number"
                min={1}
                max={1000}
                value={bulkCount}
                onChange={(e) => setBulkCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 border border-border rounded text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Number of UUIDs to generate"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" role="list" aria-label="Generated UUIDs">
            {uuids.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="status">
                Click Generate to create bulk UUIDs
              </div>
            ) : (
              <div className="divide-y divide-border">
                {uuids.map((uuid, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 group" role="listitem">
                    <span className="text-xs text-muted-foreground w-8 shrink-0" aria-label={`UUID number ${i + 1}`}>#{i + 1}</span>
                    <span className="font-mono text-xs flex-1 truncate">{uuid}</span>
                    <Button
                      variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={() => copy(uuid, `row-${i}`)}
                      aria-label={`Copy UUID ${i + 1}`}
                    >
                      {copied === `row-${i}` ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 flex items-center gap-2" role="group" aria-label="Bulk generation actions">
            <Button 
              size="sm" 
              onClick={generateBulk} 
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={`Generate ${bulkCount} UUIDs`}
            >
              <Hash className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Generate {bulkCount} UUIDs</span>
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                <span>Ctrl</span><span>Shift</span><span>B</span>
              </kbd>
            </Button>
            {uuids.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copy(uuids.join("\n"), "all")}
                  aria-label={copied === "all" ? "All UUIDs copied" : "Copy all UUIDs"}
                  className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {copied === "all" ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                  <span>Copy All</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={download}
                  aria-label="Download UUIDs as text file"
                  className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                  <span>Download</span>
                  <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                    <span>Ctrl</span><span>Shift</span><span>D</span>
                  </kbd>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
