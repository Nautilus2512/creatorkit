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
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Text Case Converter</h1>
            <p className="text-sm text-muted-foreground">Convert text between different cases</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(input)}
              disabled={!input}
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy Input
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(input, 'converted.txt')}
              disabled={!input}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="shrink-0 border-b border-border bg-muted/30">
        <div className="px-6 py-2 flex gap-2">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
          >
            All Cases
          </Button>
          <Button
            variant={activeTab === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('individual')}
          >
            Individual
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'all' ? (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Input Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter text to convert..."
                  className="min-h-[200px] w-full resize-none font-mono text-sm"
                  rows={6}
                />
              </CardContent>
            </Card>

            {/* All Conversions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Conversions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(conversions).filter(([_, value]) => value).map(([caseType, value]) => (
                  <div key={caseType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium capitalize">{caseType}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(value)}
                        disabled={!value}
                      >
                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-md border font-mono text-sm">
                      {value || <span className="text-muted-foreground">Enter text to see conversion</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(conversions).filter(([_, value]) => value).map(([caseType, value]) => (
              <Card key={caseType}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5" />
                    {caseType}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/20 rounded-md border font-mono text-sm min-h-[100px]">
                    {value || <span className="text-muted-foreground">Enter text to see conversion</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(value)}
                      disabled={!value}
                      className="flex-1"
                    >
                      {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(value, `${caseType}-case.txt`)}
                      disabled={!value}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}