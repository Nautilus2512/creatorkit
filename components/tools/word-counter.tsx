"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const stats = useMemo(() => analyze(text), [text])

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const clearText = useCallback(() => {
    setText("")
    announceToScreenReader("Text cleared")
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "x":
            if (text) {
              e.preventDefault()
              clearText()
            }
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [text, clearText])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "X"], description: "Clear text" },
  ]

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
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Word &amp; Character Counter</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Word Counter" shortcuts={shortcuts} />
            <Button
              variant="outline"
              size="sm"
              onClick={clearText}
              disabled={!text}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Clear text"
            >
              <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Clear</span>
              <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Word Counter</h2>
            <ShortcutsModal pageName="Word Counter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Text Input
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Statistics
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel — Input */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Text input panel">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-sm font-medium" id="input-label">Text Input</span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your text here..."
                className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 leading-relaxed p-4 min-h-[200px]"
                aria-labelledby="input-label"
                aria-describedby="word-count"
              />
            </div>

          {/* Right Panel — Stats */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Statistics panel">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-sm font-medium">Statistics</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4" role="region" aria-label="Statistics cards">
                <div className="grid grid-cols-2 gap-3">
                  {statCards.map(({ label, value, highlight }) => (
                    <div
                      key={label}
                      className={`rounded-lg border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border"}`}
                      role="article"
                      aria-label={`${label}: ${value}`}
                    >
                      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {text && (
                  <div className="mt-3 rounded-lg border border-border p-4 text-xs text-muted-foreground space-y-1" role="note" aria-label="Time estimates information">
                    <p className="font-medium text-foreground text-sm mb-2">Estimates</p>
                    <p>Reading speed: ~238 words/min (average adult)</p>
                    <p>Speaking speed: ~150 words/min (presentation pace)</p>
                  </div>
                )}
              </div>
              {text && (
                <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
                  <span>{stats.words.toLocaleString()} words</span>
                  <span>{stats.chars.toLocaleString()} chars</span>
                  {stats.words > 0 && <span>~{stats.readingTime} read</span>}
                </div>
              )}
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
            variant="outline"
            onClick={clearText}
            disabled={!text}
            aria-label="Clear text"
          >
            <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
            Clear
          </Button>
        </div>

      </div>
    </>
  )
}
