"use client"

import { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

function analyze(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const charsNoSpaces = text.replace(/\s/g, "").length
  const sentences = text.trim() ? (text.match(/[.!?]+(\s|$)/g) || []).length : 0
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0
  const lines = text ? text.split("\n").length : 0
  const readingTimeSec = Math.ceil((words / 238) * 60)
  const speakingTimeSec = Math.ceil((words / 150) * 60)

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60), s = secs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  return {
    words,
    chars,
    charsNoSpaces,
    sentences,
    paragraphs,
    lines,
    readingTime: words === 0 ? "—" : formatTime(readingTimeSec),
    speakingTime: words === 0 ? "—" : formatTime(speakingTimeSec),
  }
}

export default function WordCounter() {
  const [text, setText] = useState("")
  const stats = useMemo(() => analyze(text), [text])

  const statCards = [
    { label: "Words", value: stats.words.toLocaleString(), highlight: true },
    { label: "Characters", value: stats.chars.toLocaleString(), highlight: true },
    { label: "Chars (no spaces)", value: stats.charsNoSpaces.toLocaleString(), highlight: false },
    { label: "Sentences", value: stats.sentences.toLocaleString(), highlight: false },
    { label: "Paragraphs", value: stats.paragraphs.toLocaleString(), highlight: false },
    { label: "Lines", value: stats.lines.toLocaleString(), highlight: false },
    { label: "Reading time", value: stats.readingTime, highlight: false },
    { label: "Speaking time", value: stats.speakingTime, highlight: false },
  ]

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Word & Character Counter</h1>
            <p className="text-sm text-muted-foreground">Count words, characters, sentences, and estimate reading time</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setText("")} disabled={!text}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Panel — Input */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Text Input</h3>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here..."
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 leading-relaxed"
          />
        </div>

        {/* Right Panel — Stats */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Statistics</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={`rounded-lg border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border"}`}
                >
                  <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>
                    {value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>

            {text && (
              <div className="mt-4 rounded-lg border border-border p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm mb-2">Estimates</p>
                <p>Reading speed: ~238 words/min (average adult)</p>
                <p>Speaking speed: ~150 words/min (presentation pace)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {text && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
          <span>{stats.words.toLocaleString()} words</span>
          <span>{stats.chars.toLocaleString()} chars</span>
          {stats.words > 0 && <span>~{stats.readingTime} read</span>}
        </div>
      )}
    </div>
  )
}
