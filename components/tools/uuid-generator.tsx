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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

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
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">UUID Generator</span>
          <div className="flex items-center gap-2" role="group" aria-label="UUID generation options">
            <Switch
              id="hyphens-desktop"
              checked={includeHyphens}
              onCheckedChange={setIncludeHyphens}
              aria-label="Include hyphens in UUID"
            />
            <Label htmlFor="hyphens-desktop" className="text-sm">Include hyphens</Label>
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+H</kbd>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="UUID Generator" shortcuts={shortcuts} />
            <Button
              size="sm"
              onClick={generateSingle}
              aria-label="Generate single UUID"
              className="focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Generate Single</span>
              <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+G</kbd>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={generateBulk}
              aria-label={`Generate ${bulkCount} UUIDs`}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Hash className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Generate {bulkCount}</span>
              <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+B</kbd>
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
                  <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">UUID Generator</h2>
            <ShortcutsModal pageName="UUID Generator" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Single
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Bulk
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left — Single UUID */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Single UUID panel">
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
                    <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
                  </Button>
                </div>
              </div>
            </div>

          {/* Right — Bulk Generation */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Bulk UUID generation panel">
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
              <div className="flex-1 overflow-y-auto min-h-[120px]" role="list" aria-label="Generated UUIDs">
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
                  <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+B</kbd>
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
                      <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
                    </Button>
                  </>
                )}
              </div>
          </div>
        </div>

        {/* MOBILE: bottom action bar */}
        <div
          className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={generateSingle}
            aria-label="Generate single UUID"
          >
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
            Generate Single
          </Button>
          <Button
            size="sm"
            className="h-11 px-4"
            variant="outline"
            onClick={generateBulk}
            aria-label={`Generate ${bulkCount} UUIDs`}
          >
            <Hash className="h-4 w-4 mr-1" aria-hidden="true" />
            Generate {bulkCount}
          </Button>
        </div>

      </div>
    </>
  )
}
