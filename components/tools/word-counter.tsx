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
    words, chars, charsNoSpaces, sentences, paragraphs, lines,
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
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Word & Character Counter</h2>
          <p className="text-muted-foreground">Count words, characters, sentences, and estimate reading time</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setText("")} disabled={!text}>
          <Trash2 className="h-4 w-4 mr-1" />Clear
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left Panel — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Text Input</span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here..."
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 leading-relaxed p-4"
          />
        </div>

        {/* Right Panel — Stats */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Statistics</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={`rounded-lg border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border"}`}
                >
                  <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>
            {text && (
              <div className="mt-3 rounded-lg border border-border p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm mb-2">Estimates</p>
                <p>Reading speed: ~238 words/min (average adult)</p>
                <p>Speaking speed: ~150 words/min (presentation pace)</p>
              </div>
            )}
          </div>
          {text && (
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4">
              <span>{stats.words.toLocaleString()} words</span>
              <span>{stats.chars.toLocaleString()} chars</span>
              {stats.words > 0 && <span>~{stats.readingTime} read</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
