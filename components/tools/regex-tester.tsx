"use client"

import { useState, useEffect } from "react"
import { 
  Search, Copy, Check, AlertCircle, Code, Eye, EyeOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface RegexMatch {
  match: string
  index: number
  groups: string[]
}

interface CommonPattern {
  name: string
  pattern: string
  description: string
}

const commonPatterns: CommonPattern[] = [
  {
    name: "Email",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    description: "Match email addresses"
  },
  {
    name: "Phone (US)",
    pattern: "^\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})$",
    description: "Match US phone numbers"
  },
  {
    name: "URL",
    pattern: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    description: "Match HTTP/HTTPS URLs"
  },
  {
    name: "IPv4 Address",
    pattern: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
    description: "Match IPv4 addresses"
  },
  {
    name: "Hex Color",
    pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
    description: "Match hex color codes"
  }
]

export default function RegexTester() {
  const [pattern, setPattern] = useState("")
  const [testText, setTestText] = useState("")
  const [flags, setFlags] = useState({
    g: true,
    i: false,
    m: false,
    s: false,
    u: false,
    y: false
  })
  const [matches, setMatches] = useState<RegexMatch[]>([])
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (pattern && testText) {
      testRegex()
    } else {
      setMatches([])
      setError("")
    }
  }, [pattern, testText, flags])

  const testRegex = () => {
    try {
      const flagString = Object.entries(flags)
        .filter(([_, enabled]) => enabled)
        .map(([flag, _]) => flag)
        .join('')

      const regex = new RegExp(pattern, flagString)
      const foundMatches: RegexMatch[] = []

      if (flags.g) {
        let match
        while ((match = regex.exec(testText)) !== null) {
          foundMatches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1)
          })
        }
      } else {
        const match = regex.exec(testText)
        if (match) {
          foundMatches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1)
          })
        }
      }

      setMatches(foundMatches)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid regex pattern")
      setMatches([])
    }
  }

  const copyPattern = () => {
    navigator.clipboard.writeText(pattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightMatches = (text: string) => {
    if (!pattern || matches.length === 0) return text

    let highlightedText = text
    const sortedMatches = [...matches].sort((a, b) => b.index - a.index)

    sortedMatches.forEach((match, index) => {
      const before = highlightedText.substring(0, match.index)
      const matchText = highlightedText.substring(match.index, match.index + match.match.length)
      const after = highlightedText.substring(match.index + match.match.length)
      
      highlightedText = before + `<mark class="bg-yellow-200 text-black px-1 rounded">${matchText}</mark>` + after
    })

    return highlightedText
  }

  const useCommonPattern = (commonPattern: CommonPattern) => {
    setPattern(commonPattern.pattern)
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Regex Tester</h2>
          <p className="text-muted-foreground">Test and debug regular expressions</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyPattern} disabled={!pattern}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}Copy Pattern
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Patterns:</span>
        {commonPatterns.map((p) => (
          <Button key={p.name} variant="outline" size="sm" onClick={() => useCommonPattern(p)} className="text-xs h-7">{p.name}</Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Regex */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Regular Expression</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Input placeholder="Enter your regex pattern (e.g., \\d+)" value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono" />
            <div>
              <h4 className="text-sm font-medium mb-3">Flags</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(flags).map(([flag, enabled]) => (
                  <div key={flag} className="flex items-center gap-2">
                    <Switch id={flag} checked={enabled} onCheckedChange={(c) => setFlags(prev => ({ ...prev, [flag]: c }))} />
                    <Label htmlFor={flag} className="text-sm font-mono">{flag}</Label>
                  </div>
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />{error}
              </div>
            )}
            {matches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Match Details ({matches.length})</h4>
                <div className="space-y-2">
                  {matches.map((match, index) => (
                    <div key={index} className="p-3 border rounded-md bg-muted/20 font-mono text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                        <span className="text-muted-foreground text-xs">Pos: {match.index}</span>
                      </div>
                      <div className="bg-background p-2 rounded border text-xs">{match.match}</div>
                      {match.groups.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Groups:</div>
                          {match.groups.map((group, gi) => (
                            <div key={gi} className="text-xs bg-background p-1 rounded border mt-1">{gi + 1}: {group || '(empty)'}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Test Text */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" />Test Text</span>
            {matches.length > 0 && <Badge variant="secondary" className="text-xs">{matches.length} match{matches.length !== 1 ? 'es' : ''}</Badge>}
          </div>
          {matches.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="font-mono text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightMatches(testText) }} />
            </div>
          ) : (
            <Textarea value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Enter text to test against your regex..." className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4" />
          )}
        </div>
      </div>
    </div>
  )
}