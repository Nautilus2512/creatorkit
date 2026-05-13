"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Type, Copy, Download, Check, ArrowUpDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface CaseConversion {
  upper: string
  lower: string
  title: string
  camel: string
  snake: string
  kebab: string
}

export default function TextCaseConverter() {
  const [input, setInput] = useState("")
  const [conversions, setConversions] = useState<CaseConversion>({
    upper: "",
    lower: "",
    title: "",
    camel: "",
    snake: "",
    kebab: ""
  })
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'individual'>('all')
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
        title: input.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
        ),
        camel: input.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
          word === input ? '' : index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).replace(/[^a-zA-Z0-9]/g, ''),
        snake: input.replace(/\w\S*/g, (txt) => 
          txt.toLowerCase().replace(/\s+/g, '_')
        ),
        kebab: input.replace(/\w\S*/g, (txt) => 
          txt.toLowerCase().replace(/\s+/g, '-')
        )
      })
    } else {
      setConversions({
        upper: "",
        lower: "",
        title: "",
        camel: "",
        snake: "",
        kebab: ""
      })
    }
  }, [input])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    announceToScreenReader("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [announceToScreenReader])

  const downloadFile = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    announceToScreenReader(`Downloaded ${filename}`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            if (input) {
              e.preventDefault()
              copyToClipboard(input)
            }
            break
          case "d":
            if (input) {
              e.preventDefault()
              downloadFile(input, 'text.txt')
            }
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Text Case Converter</h2>
          <p className="text-muted-foreground">Convert text between different cases</p>
        </div>
        <ShortcutsModal pageName="Text Case Converter" shortcuts={shortcuts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Input text">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">Input Text</span>
          </div>
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Enter text to convert..."
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
            aria-label="Enter text to convert to different cases"
          />
          {input && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 flex gap-2" role="group" aria-label="Input text actions">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(input)}
                aria-label={copied ? "Input text copied" : "Copy input text"}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                <span>Copy</span>
                <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+C</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => downloadFile(input, 'text.txt')}
                aria-label="Download input text"
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Download className="h-4 w-4 mr-1" />
                <span>Download</span>
                <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+D</kbd>
              </Button>
            </div>
          )}
        </div>

        {/* Right — Conversions */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Converted text cases">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">All Conversions</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" role="list">
            {Object.entries(conversions).map(([caseType, value]) => (
              <div key={caseType} className="space-y-1.5" role="listitem" aria-label={`${caseType} case conversion`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize text-muted-foreground">{caseType}</span>
                  <div className="flex gap-1" role="group" aria-label={`${caseType} case actions`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      onClick={() => copyToClipboard(value)} 
                      disabled={!value}
                      aria-label={`Copy ${caseType} case text`}
                    >
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      <span>Copy</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      onClick={() => downloadFile(value, `${caseType}.txt`)} 
                      disabled={!value}
                      aria-label={`Download ${caseType} case text`}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>
                <div 
                  className="p-2.5 bg-muted/20 rounded-md border font-mono text-sm min-h-[2rem]"
                  aria-label={`${caseType} case result`}
                >
                  {value || <span className="text-muted-foreground text-xs">Enter text above</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}