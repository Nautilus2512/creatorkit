"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface CaseConversion {
  upper: string; lower: string; title: string; camel: string; snake: string; kebab: string
}

export default function TextCaseConverter() {
  const [input, setInput] = useState("")
  const [conversions, setConversions] = useState<CaseConversion>({ upper: "", lower: "", title: "", camel: "", snake: "", kebab: "" })
  const [copied, setCopied] = useState(false)
  const [panelTab, setPanelTab] = useState<"input" | "output">("input")
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  useEffect(() => {
    if (input) {
      setConversions({
        upper: input.toUpperCase(),
        lower: input.toLowerCase(),
        title: input.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()),
        camel: input.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          word === input ? "" : index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).replace(/[^a-zA-Z0-9]/g, ""),
        snake: input.replace(/\w\S*/g, txt => txt.toLowerCase().replace(/\s+/g, "_")),
        kebab: input.replace(/\w\S*/g, txt => txt.toLowerCase().replace(/\s+/g, "-")),
      })
    } else {
      setConversions({ upper: "", lower: "", title: "", camel: "", snake: "", kebab: "" })
    }
  }, [input])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    announceToScreenReader("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [announceToScreenReader])

  const downloadFile = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    announceToScreenReader(`Downloaded ${filename}`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c": if (input) { e.preventDefault(); copyToClipboard(input) } break
          case "d": if (input) { e.preventDefault(); downloadFile(input, "text.txt") } break
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [input, copyToClipboard, downloadFile])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Copy input text" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download input text" },
  ]

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    announceToScreenReader("Input text updated")
  }, [announceToScreenReader])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <div className="flex flex-1 flex-col min-h-0">

        {/* ── Desktop: top action bar ── */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Text case controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Text Case Converter</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Text Case Converter" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(input)} disabled={!input} aria-label="Copy input text">
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile(input, "text.txt")} disabled={!input} aria-label="Download input text">
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          </div>
        </div>

        {/* ── Mobile: compact header + tab switcher ── */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Text Case Converter</h2>
            <ShortcutsModal pageName="Text Case Converter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={panelTab === "input"} onClick={() => setPanelTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${panelTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Input
            </button>
            <button role="tab" aria-selected={panelTab === "output"} onClick={() => setPanelTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${panelTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Conversions
            </button>
          </div>
        </div>

        {/* ── Panels ── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${panelTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Input text">
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Enter text to convert…"
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
              aria-label="Enter text to convert to different cases"
            />
          </div>

          {/* Output panel */}
          <div className={`${panelTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Converted text cases">
            <div className="flex-1 overflow-y-auto p-4 space-y-3" role="list">
              {Object.entries(conversions).map(([caseType, value]) => (
                <div key={caseType} className="space-y-1.5" role="listitem" aria-label={`${caseType} case conversion`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium capitalize text-muted-foreground">{caseType}</span>
                    <div className="flex gap-1" role="group" aria-label={`${caseType} case actions`}>
                      <Button variant="ghost" size="sm" className="h-6 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" onClick={() => copyToClipboard(value)} disabled={!value} aria-label={`Copy ${caseType} case text`}>
                        {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}<span>Copy</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" onClick={() => downloadFile(value, `${caseType}.txt`)} disabled={!value} aria-label={`Download ${caseType} case text`}>
                        <Download className="h-3 w-3 mr-1" /><span>Download</span>
                      </Button>
                    </div>
                  </div>
                  <div className="p-2.5 bg-muted/20 rounded-md border font-mono text-sm min-h-[2rem]" aria-label={`${caseType} case result`}>
                    {value || <span className="text-muted-foreground text-xs">Enter text above</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile: bottom action bar ── */}
        <div
          className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={() => copyToClipboard(input)} disabled={!input} aria-label="Copy input text">
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={() => downloadFile(input, "text.txt")} disabled={!input} aria-label="Download input text">
            <Download className="h-4 w-4" aria-hidden="true" /><span className="ml-1 text-xs">Save</span>
          </Button>
        </div>

      </div>
    </>
  )
}
