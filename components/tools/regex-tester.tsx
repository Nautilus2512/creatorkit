"use client"

import { useState, useEffect, useCallback } from "react"
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
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

const shortcuts = [
  { keys: ["Ctrl", "Shift", "C"], description: "Copy pattern" },
  { keys: ["Ctrl", "Shift", "T"], description: "Focus test text" },
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
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

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

  const copyPattern = useCallback(() => {
    if (!pattern) return
    navigator.clipboard.writeText(pattern)
    setCopied(true)
    announceToScreenReader("Pattern copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [pattern, announceToScreenReader])

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

  const useCommonPattern = useCallback((commonPattern: CommonPattern) => {
    setPattern(commonPattern.pattern)
    announceToScreenReader(`Applied ${commonPattern.name} pattern`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            if (pattern) {
              e.preventDefault()
              copyPattern()
            }
            break
          case "t":
            e.preventDefault()
            document.getElementById("test-text-area")?.focus()
            announceToScreenReader("Test text area focused")
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pattern, copyPattern, announceToScreenReader])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Regex Tester controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Regex Tester</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          {/* Common patterns */}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Common regex patterns">
            <span className="text-xs text-muted-foreground self-center">Patterns:</span>
            {commonPatterns.map((p) => (
              <Button
                key={p.name}
                variant="outline"
                size="sm"
                onClick={() => useCommonPattern(p)}
                className="text-xs h-7 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={`Apply ${p.name} pattern: ${p.description}`}
              >
                {p.name}
              </Button>
            ))}
          </div>

          {/* RIGHT: primary output actions + ShortcutsModal */}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Regex Tester" shortcuts={shortcuts} />
            <Button
              variant="outline"
              size="sm"
              onClick={copyPattern}
              disabled={!pattern}
              aria-label={copied ? "Pattern copied" : "Copy regex pattern"}
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              <span>Copy Pattern</span>
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Regex Tester</h2>
            <ShortcutsModal pageName="Regex Tester" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Pattern
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Matches {matches.length > 0 && `(${matches.length})`}
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel — Pattern + flags + test string */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Pattern input">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Mobile common patterns */}
              <div className="md:hidden flex flex-wrap gap-1" role="group" aria-label="Common regex patterns">
                <span className="text-xs text-muted-foreground self-center w-full">Patterns:</span>
                {commonPatterns.map((p) => (
                  <Button
                    key={p.name}
                    variant="outline"
                    size="sm"
                    onClick={() => useCommonPattern(p)}
                    className="text-xs h-7 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={`Apply ${p.name} pattern: ${p.description}`}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>

              <Input
                id="regex-pattern"
                placeholder="Enter your regex pattern (e.g., \d+)"
                value={pattern}
                onChange={(e) => { setPattern(e.target.value); announceToScreenReader("Pattern updated") }}
                className="font-mono"
                aria-describedby="pattern-desc"
              />
              <span id="pattern-desc" className="sr-only">Enter a regular expression pattern to test</span>
              <div role="group" aria-labelledby="flags-heading">
                <h4 id="flags-heading" className="text-sm font-medium mb-3">Flags</h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(flags).map(([flag, enabled]) => {
                    const flagDescriptions: Record<string, string> = {
                      g: "Global - find all matches",
                      i: "Case insensitive",
                      m: "Multiline - ^ and $ match line boundaries",
                      s: "Dotall - . matches newlines",
                      u: "Unicode - enable Unicode features",
                      y: "Sticky - match from lastIndex"
                    }
                    return (
                      <div key={flag} className="flex items-center gap-2">
                        <Switch
                          id={`flag-${flag}`}
                          checked={enabled}
                          onCheckedChange={(c) => {
                            setFlags(prev => ({ ...prev, [flag]: c }))
                            announceToScreenReader(`${flag} flag ${c ? 'enabled' : 'disabled'}`)
                          }}
                          aria-label={`${flag}: ${flagDescriptions[flag] || flag}`}
                        />
                        <Label htmlFor={`flag-${flag}`} className="text-sm font-mono cursor-pointer">{flag}</Label>
                      </div>
                    )
                  })}
                </div>
              </div>
              {error && (
                <div role="alert" className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Test Text
                  {matches.length > 0 && <Badge variant="secondary" className="text-xs" aria-label={`${matches.length} matches found`}>{matches.length} match{matches.length !== 1 ? 'es' : ''}</Badge>}
                </h4>
                <Textarea
                  id="test-text-area"
                  value={testText}
                  onChange={(e) => { setTestText(e.target.value); announceToScreenReader("Test text updated") }}
                  placeholder="Enter text to test against your regex..."
                  className="resize-none border focus-visible:ring-0 font-mono text-sm p-4 min-h-[120px]"
                  aria-label="Enter text to test against your regex pattern"
                />
              </div>
            </div>
          </div>

          {/* Output panel — Matches */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Match results">
            <div className="flex-1 overflow-y-auto p-4">
              {matches.length > 0 ? (
                <div>
                  <div className="mb-4" role="region" aria-label="Highlighted matches">
                    <h4 className="text-sm font-medium mb-2">Highlighted Text</h4>
                    <div
                      className="font-mono text-sm whitespace-pre-wrap p-3 rounded-md border border-border bg-muted/10"
                      dangerouslySetInnerHTML={{ __html: highlightMatches(testText) }}
                      aria-label={`Test text with ${matches.length} highlighted matches`}
                    />
                  </div>
                  <div role="region" aria-label={`Match details: ${matches.length} matches found`}>
                    <h4 className="text-sm font-medium mb-3">Match Details ({matches.length})</h4>
                    <div className="space-y-2" role="list">
                      {matches.map((match, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-md bg-muted/20 font-mono text-sm"
                          role="listitem"
                          aria-label={`Match ${index + 1}: "${match.match}" at position ${match.index}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs" aria-label={`Match number ${index + 1}`}>{index + 1}</Badge>
                            <span className="text-muted-foreground text-xs">Pos: {match.index}</span>
                          </div>
                          <div className="bg-background p-2 rounded border text-xs" aria-label={`Matched text: ${match.match}`}>{match.match}</div>
                          {match.groups.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">Groups:</div>
                              {match.groups.map((group, gi) => (
                                <div key={gi} className="text-xs bg-background p-1 rounded border mt-1" aria-label={`Group ${gi + 1}: ${group || '(empty)'}`}>{gi + 1}: {group || '(empty)'}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2" role="status">
                  <Search className="h-12 w-12 opacity-30" aria-hidden="true" />
                  <p className="text-sm">Enter a pattern and test text to see matches</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={copyPattern} disabled={!pattern}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy Pattern"}</span>
          </Button>
        </div>

      </div>
    </>
  )
}
