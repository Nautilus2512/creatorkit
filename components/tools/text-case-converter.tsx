"use client"

import { useState, useEffect } from "react"
import { 
  Type, Copy, Download, Check, ArrowUpDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Text Case Converter</h2>
        <p className="text-muted-foreground">Convert text between different cases</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Input Text</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to convert..."
            className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0 p-4"
          />
          {input && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(input)}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => downloadFile(input, 'text.txt')}>
                <Download className="h-4 w-4 mr-1" />Download
              </Button>
            </div>
          )}
        </div>

        {/* Right — Conversions */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">All Conversions</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {Object.entries(conversions).map(([caseType, value]) => (
              <div key={caseType} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize text-muted-foreground">{caseType}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(value)} disabled={!value}>
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => downloadFile(value, `${caseType}.txt`)} disabled={!value}>
                      <Download className="h-3 w-3 mr-1" />Download
                    </Button>
                  </div>
                </div>
                <div className="p-2.5 bg-muted/20 rounded-md border font-mono text-sm min-h-[2rem]">
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