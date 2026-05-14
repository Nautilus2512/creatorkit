"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Brain, Plus, Trash2, BookOpen, RotateCcw, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ── Types ────────────────────────────────────────────────────────────────────
interface Card {
  id: string
  front: string
  back: string
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string
}
interface Deck { id: string; name: string; cards: Card[] }

// ── SM-2 Spaced Repetition Algorithm ────────────────────────────────────────
function sm2(card: Card, quality: number): Card {
  let { interval, repetitions, easeFactor } = card
  if (quality >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions++
  } else {
    repetitions = 0
    interval = 1
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const d = new Date()
  d.setDate(d.getDate() + interval)
  return { ...card, interval, repetitions, easeFactor, dueDate: d.toISOString().split("T")[0] }
}

// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "creatorkit-anki-decks"
function loadDecks(): Deck[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : [] }
  catch { return [] }
}
function saveDecks(decks: Deck[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(decks)) } catch {}
}

const LOG_KEY = "creatorkit-anki-log"
type StudyLog = Record<string, number>

function loadLog(): StudyLog {
  try { const r = localStorage.getItem(LOG_KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}
function saveLog(log: StudyLog): void {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)) } catch {}
}
function calcStreak(log: StudyLog): number {
  const today = new Date()
  const todayStr2 = today.toISOString().split("T")[0]
  const startOffset = (log[todayStr2] ?? 0) > 0 ? 0 : 1
  let streak = 0
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const s = d.toISOString().split("T")[0]
    if ((log[s] ?? 0) > 0) streak++
    else break
  }
  return streak
}


// ── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0]
const isDue = (c: Card) => c.dueDate <= todayStr()
const newCard = (front: string, back: string): Card => ({
  id: crypto.randomUUID(), front, back,
  interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: todayStr(),
})
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function nextInterval(card: Card, quality: number): string {
  const u = sm2(card, quality)
  return u.interval === 1 ? "1 day" : `${u.interval} days`
}

// ── Component ────────────────────────────────────────────────────────────────
type View = "study" | "add-card" | "done" | "empty"

const shortcuts = [
  { keys: ["Ctrl", "Shift", "X"], description: "Create new deck" },
  { keys: ["Ctrl", "Shift", "V"], description: "Add new card to deck" },
  { keys: ["Ctrl", "Shift", "S"], description: "Start studying" },
  { keys: ["Ctrl", "Shift", "L"], description: "Switch to next deck" },
  { keys: ["Ctrl", "Shift", "Enter"], description: "Add card (in Add Card view)" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Clear all data (shows confirmation)" },
  { keys: ["Delete"], description: "Delete card from list" },
  { keys: ["Backspace"], description: "Delete card from list" },
  { keys: ["Space"], description: "Flip card / Show answer (in study mode)" },
  { keys: ["Enter"], description: "Create deck (when typing name)" },
  { keys: ["1"], description: "Rate card as Again (in study mode)" },
  { keys: ["2"], description: "Rate card as Hard (in study mode)" },
  { keys: ["3"], description: "Rate card as Good (in study mode)" },
  { keys: ["4"], description: "Rate card as Easy (in study mode)" },
  { keys: ["Escape"], description: "Cancel / Return to add card view" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between elements" },
  { keys: ["Arrow Keys"], description: "Navigate deck list" },
]

export function AnkiCard() {
  const [decks, setDecks]               = useState<Deck[]>([])
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null)
  const [newDeckName, setNewDeckName]   = useState("")
  const [addingDeck, setAddingDeck]     = useState(false)
  const [front, setFront]               = useState("")
  const [back, setBack]                 = useState("")
  const [view, setView]                 = useState<View>("empty")
  const [queue, setQueue]               = useState<Card[]>([])
  const [currentIdx, setCurrentIdx]     = useState(0)
  const [isFlipped, setIsFlipped]       = useState(false)
  const [studiedCount, setStudiedCount] = useState(0)
  const [mounted, setMounted]           = useState(false)
  const [studyLog, setStudyLog] = useState<StudyLog>({})

  useEffect(() => {
    setMounted(true)
    const loaded = loadDecks()
    setDecks(loaded)
    if (loaded.length > 0) setActiveDeckId(loaded[0].id)
    setStudyLog(loadLog())
  }, [])

  const activeDeck = decks.find(d => d.id === activeDeckId) ?? null
  const dueCards = activeDeck ? activeDeck.cards.filter(isDue) : []

  useEffect(() => {
    if (!activeDeck) { setView("empty"); return }
    if (dueCards.length === 0 && view !== "add-card") { setView("done"); return }
    if (dueCards.length > 0 && view === "empty") setView("study")
  }, [activeDeckId])

  const clearAllData = useCallback(() => {
    const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0)
    if (!confirm(`Delete all ${decks.length} deck${decks.length !== 1 ? "s" : ""} (${totalCards} card${totalCards !== 1 ? "s" : ""}) and study history? This cannot be undone.`)) return
    setDecks([])
    saveDecks([])
    setStudyLog({})
    saveLog({})
    setActiveDeckId(null)
    setView("empty")
  }, [decks])

  const startStudy = useCallback(() => {
    if (!activeDeck) return
    const due = shuffle(activeDeck.cards.filter(isDue))
    setQueue(due); setCurrentIdx(0); setIsFlipped(false); setStudiedCount(0); setView("study")
  }, [activeDeck])

  const rateCard = useCallback((quality: number) => {
    if (!activeDeck || queue.length === 0) return
    const card = queue[currentIdx]
    const updated = sm2(card, quality)
    const newDecks = decks.map(d =>
      d.id === activeDeckId ? { ...d, cards: d.cards.map(c => c.id === card.id ? updated : c) } : d
    )
    setDecks(newDecks); saveDecks(newDecks); setStudiedCount(prev => prev + 1)
    const today2 = todayStr()
    const newLog = { ...studyLog, [today2]: (studyLog[today2] ?? 0) + 1 }
    setStudyLog(newLog); saveLog(newLog)
    if (currentIdx + 1 >= queue.length) { setView("done") }
    else { setCurrentIdx(currentIdx + 1); setIsFlipped(false) }
  }, [activeDeck, activeDeckId, decks, queue, currentIdx, studyLog])

  const addCard = useCallback(() => {
    if (!front.trim() || !back.trim() || !activeDeckId) return
    const card = newCard(front.trim(), back.trim())
    const newDecks = decks.map(d => d.id === activeDeckId ? { ...d, cards: [...d.cards, card] } : d)
    setDecks(newDecks); saveDecks(newDecks); setFront(""); setBack("")
  }, [front, back, activeDeckId, decks])

  const createDeck = useCallback(() => {
    if (!newDeckName.trim()) return
    const deck: Deck = { id: crypto.randomUUID(), name: newDeckName.trim(), cards: [] }
    const newDecks = [...decks, deck]
    setDecks(newDecks); saveDecks(newDecks)
    setActiveDeckId(deck.id); setNewDeckName(""); setAddingDeck(false); setView("add-card")
  }, [newDeckName, decks])

  const deleteDeck = (id: string) => {
    const newDecks = decks.filter(d => d.id !== id)
    setDecks(newDecks); saveDecks(newDecks)
    if (activeDeckId === id) setActiveDeckId(newDecks.length > 0 ? newDecks[0].id : null)
  }

  const deleteCard = (cardId: string) => {
    const newDecks = decks.map(d =>
      d.id === activeDeckId ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d
    )
    setDecks(newDecks); saveDecks(newDecks)
  }

  const handleCardKeyDown = (e: React.KeyboardEvent, cardId: string) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      deleteCard(cardId)
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "X" && !addingDeck) {
        e.preventDefault()
        setAddingDeck(true)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V" && activeDeck && view !== "add-card") {
        e.preventDefault()
        setView("add-card")
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S" && activeDeck && dueCards.length > 0 && view !== "study") {
        e.preventDefault()
        startStudy()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L" && activeDeck) {
        e.preventDefault()
        if (decks.length > 1) {
          const currentIdx = decks.findIndex(d => d.id === activeDeckId)
          const nextIdx = (currentIdx + 1) % decks.length
          setActiveDeckId(decks[nextIdx].id)
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter" && view === "add-card") {
        e.preventDefault()
        addCard()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z" && decks.length > 0) {
        e.preventDefault()
        clearAllData()
        return
      }
      if (e.key === "Escape") {
        if (addingDeck) {
          e.preventDefault()
          setAddingDeck(false)
          setNewDeckName("")
        }
        if (view === "study") {
          e.preventDefault()
          setView("add-card")
        }
        return
      }
      if (e.key === "Tab" && activeDeck && view === "empty") {
        return
      }

      if (view === "study") {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!isFlipped) setIsFlipped(true) }
        if (isFlipped) {
          if (e.key === "1") rateCard(0)
          if (e.key === "2") rateCard(2)
          if (e.key === "3") rateCard(4)
          if (e.key === "4") rateCard(5)
        }
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        return
      }
    }
    window.addEventListener("keydown", h)
    return () => { window.removeEventListener("keydown", h) }
  }, [view, isFlipped, rateCard, addCard, addingDeck, activeDeck, dueCards, startStudy, decks, activeDeckId])

  const currentCard = queue[currentIdx] ?? null
  const deckListRef = useRef<HTMLDivElement>(null)

  if (!mounted) return null

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {studiedCount > 0 && `You have studied ${studiedCount} card${studiedCount !== 1 ? 's' : ''} this session.`}
      </div>

      <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Anki Flashcards application">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Anki Flashcards</span>
          {Object.keys(studyLog).length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-amber-500 font-medium">{calcStreak(studyLog)}d</span>
                <span className="text-muted-foreground">streak</span>
              </div>
              <div className="text-muted-foreground">{Object.values(studyLog).reduce((a,b)=>a+b,0)} total</div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {decks.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllData} aria-label="Clear all decks and study history" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />Clear data
                <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Z</kbd>
              </Button>
            )}
            <ShortcutsModal pageName="Anki Flashcards" shortcuts={shortcuts} />
            <button
              onClick={() => setAddingDeck(v => !v)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Create new deck"
              aria-expanded={addingDeck}
              aria-controls="new-deck-form"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />New Deck
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeDeck && setView("add-card")}
              disabled={!activeDeck}
              aria-label="Add new card"
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Add Card
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
            </Button>
            <Button
              size="sm"
              onClick={startStudy}
              disabled={!activeDeck || dueCards.length === 0}
              aria-label={dueCards.length > 0 ? `Study now: ${dueCards.length} cards due` : "No cards due"}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Study {dueCards.length > 0 && `(${dueCards.length})`}
              <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header */}
        <div className="flex md:hidden shrink-0 items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Anki Flashcards</h2>
          <ShortcutsModal pageName="Anki Flashcards" shortcuts={shortcuts} />
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 h-full min-h-0">
          {/* Left panel — deck management */}
          <div className="flex flex-col rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Deck management">
            {/* Action buttons at top */}
            {activeDeck && (
              <div className="shrink-0 border-b border-border p-3 flex gap-2">
                <Button
                  variant={view === "study" ? "default" : "outline"}
                  size="sm" className="flex-1"
                  onClick={startStudy}
                  disabled={dueCards.length === 0}
                  aria-label={dueCards.length > 0 ? `Study now: ${dueCards.length} cards due` : "No cards due"}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Study {dueCards.length > 0 && `(${dueCards.length})`}
                </Button>
                <Button
                  variant={view === "add-card" ? "default" : "outline"}
                  size="sm" className="flex-1"
                  onClick={() => setView("add-card")}
                  aria-label="Add new card"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Add Card
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-4" tabIndex={-1}>

              {/* Deck list - compact */}
              <div className="space-y-2" role="group" aria-labelledby="decks-heading">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground" id="decks-heading">DECKS</Label>
                  <button
                    onClick={() => setAddingDeck(v => !v)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    aria-label="Create new deck"
                    aria-expanded={addingDeck}
                    aria-controls="new-deck-form"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />New <kbd className="ml-1 hidden md:inline px-1 rounded bg-muted font-mono text-[9px]">Ctrl+Shift+X</kbd>
                  </button>
                </div>

                {addingDeck && (
                  <div className="flex gap-2" id="new-deck-form" role="form" aria-label="Create new deck form">
                    <Input
                      autoFocus
                      placeholder="Deck name…"
                      value={newDeckName}
                      onChange={e => setNewDeckName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") createDeck(); if (e.key === "Escape") setAddingDeck(false) }}
                      className="text-sm h-8"
                      aria-label="Enter deck name"
                    />
                    <Button size="sm" onClick={createDeck} disabled={!newDeckName.trim()} className="h-8 px-3">Add <kbd className="ml-1.5 hidden md:inline px-1 rounded bg-white/20 font-mono text-[9px]">Enter</kbd></Button>
                  </div>
                )}

                {decks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No decks — click New to create</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Available decks">
                    {decks.map(d => {
                      const due = d.cards.filter(isDue).length
                      return (
                        <div key={d.id} className="flex items-center gap-1 rounded-md border px-2 py-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          onClick={() => setActiveDeckId(d.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActiveDeckId(d.id) }}
                          style={activeDeckId === d.id ? { borderColor: 'var(--primary)', backgroundColor: 'rgba(var(--primary-rgb), 0.05)' } : {}}
                          aria-label={`${d.name}: ${d.cards.length} cards${due > 0 ? `, ${due} due` : ''}`}
                        >
                          <BookOpen className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span className="text-xs font-medium">{d.name}</span>
                          {due > 0 && <Badge className="text-[10px] py-0 px-1.5" variant="secondary">{due}</Badge>}
                          <button
                            onClick={e => { e.stopPropagation(); deleteDeck(d.id) }}
                            aria-label={`Delete deck: ${d.name}`}
                            className="rounded p-0.5 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Stats - compact inline */}
              {activeDeck && (
                <div className="flex items-center gap-4 text-xs" role="region" aria-label="Deck stats">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{activeDeck.cards.length}</span>
                    <span className="text-muted-foreground">cards</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`font-semibold ${dueCards.length > 0 ? "text-amber-500" : "text-green-500"}`}>{dueCards.length}</span>
                    <span className="text-muted-foreground">due</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-primary">{studiedCount}</span>
                    <span className="text-muted-foreground">studied</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — contextual */}
          <div className="flex flex-col rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Content area">
            {/* Header showing current view */}
            <div className="shrink-0 border-b border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {view === "empty" && "Select a deck"}
                  {view === "add-card" && "Add Card"}
                  {view === "study" && "Study Mode"}
                  {view === "done" && "All Done!"}
                </span>
                {view === "study" && currentCard && (
                  <span className="text-xs text-muted-foreground">{currentIdx + 1}/{queue.length}</span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3" tabIndex={-1}>

              {/* Empty state */}
              {view === "empty" && (
                <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 text-center" role="status" aria-live="polite">
                  <Brain className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Create a deck to start</p>
                </div>
              )}

              {/* All caught up */}
              {view === "done" && (
                <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite">
                  <div className="rounded-full border border-green-500/30 bg-green-500/10 p-3">
                    <Brain className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-sm font-medium">
                    {studiedCount > 0 ? `Done! ${studiedCount} card${studiedCount > 1 ? "s" : ""} reviewed.` : "All caught up!"}
                  </p>
                  <p className="text-xs text-muted-foreground">No cards due today</p>
                  <div className="flex gap-2 mt-2" role="group" aria-label="Session actions">
                    <Button variant="outline" size="sm" onClick={() => setView("add-card")} aria-label="Add card">
                      <Plus className="h-3.5 w-3.5 mr-1" />Add Card <kbd className="ml-1.5 hidden md:inline px-1 rounded bg-white/20 font-mono text-[9px]">Ctrl+Shift+V</kbd>
                    </Button>
                    {dueCards.length > 0 && (
                      <Button size="sm" onClick={startStudy} aria-label="Study again">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />Study <kbd className="ml-1.5 hidden md:inline px-1 rounded bg-white/20 font-mono text-[9px]">Ctrl+Shift+S</kbd>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Add card form */}
              {view === "add-card" && (
                <div className="space-y-3" role="form" aria-label="Add new card form">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium" htmlFor="front-input">Question</Label>
                    <Textarea
                      id="front-input"
                      placeholder="What is the capital of France?"
                      value={front}
                      onChange={e => setFront(e.target.value)}
                      className="resize-none text-sm" rows={2}
                      aria-label="Enter question"
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium" htmlFor="back-input">Answer</Label>
                    <Textarea
                      id="back-input"
                      placeholder="Paris"
                      value={back}
                      onChange={e => setBack(e.target.value)}
                      className="resize-none text-sm" rows={2}
                      aria-label="Enter answer"
                      aria-required="true"
                    />
                  </div>
                  <div className="flex gap-2" role="group" aria-label="Card actions">
                    <Button
                      onClick={addCard}
                      disabled={!front.trim() || !back.trim()}
                      className="flex-1"
                      size="sm"
                      aria-label="Add card to deck"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />Add Card <kbd className="ml-1.5 hidden md:inline px-1 rounded bg-white/20 font-mono text-[9px]">Ctrl+Shift+V</kbd>
                    </Button>
                  </div>

                  {activeDeck && activeDeck.cards.length > 0 && (
                    <div className="pt-2 border-t border-border" role="region" aria-label="Card list">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{activeDeck.cards.length} cards</p>
                      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Cards">
                        {activeDeck.cards.slice(-6).map(c => (
                          <div key={c.id} className="flex items-center gap-1 rounded bg-muted/30 px-2 py-1 text-xs">
                            <span className="truncate max-w-[100px]">{c.front}</span>
                            <button onClick={() => deleteCard(c.id)} className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {activeDeck.cards.length > 6 && (
                        <p className="text-[10px] text-muted-foreground mt-2">+{activeDeck.cards.length - 6} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Study mode */}
              {view === "study" && currentCard && (
                <div className="flex flex-col h-full gap-3" role="region" aria-label="Study mode">
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div
                      className="w-full rounded-lg border border-border bg-muted/20 p-4 min-h-[120px] flex flex-col items-center justify-center text-center"
                      role="article"
                      aria-label={isFlipped ? "Answer" : "Question"}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-2">
                        {isFlipped ? "Answer" : "Question"}
                      </p>
                      <p className="text-base font-medium whitespace-pre-wrap">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </p>
                    </div>

                    {!isFlipped ? (
                      <Button className="w-full" size="sm" onClick={() => setIsFlipped(true)} aria-label="Show answer">
                        <Eye className="h-3.5 w-3.5 mr-1" />Show Answer <kbd className="ml-1.5 hidden md:inline px-1 rounded bg-white/20 font-mono text-[9px]">Space</kbd>
                      </Button>
                    ) : (
                      <div className="w-full space-y-2" role="group" aria-label="Rate recall">
                        <p className="text-xs text-center text-muted-foreground">How well did you remember?</p>
                        <div className="grid grid-cols-4 gap-1.5" role="radiogroup">
                          {[
                            { label: "Again", quality: 0, color: "border-red-500/30 bg-red-500/10 text-red-600",       key: "1" },
                            { label: "Hard",  quality: 2, color: "border-orange-500/30 bg-orange-500/10 text-orange-600", key: "2" },
                            { label: "Good",  quality: 4, color: "border-green-500/30 bg-green-500/10 text-green-600", key: "3" },
                            { label: "Easy",  quality: 5, color: "border-blue-500/30 bg-blue-500/10 text-blue-600",    key: "4" },
                          ].map(({ label, quality, color, key }) => (
                            <button
                              key={label}
                              onClick={() => rateCard(quality)}
                              className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs font-medium ${color}`}
                              aria-label={`Rate as ${label} — press ${key} — ${nextInterval(currentCard, quality)} interval`}
                            >
                              <kbd
                                className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 text-[10px] font-mono leading-tight"
                                aria-hidden="true"
                              >{key}</kbd>
                              <span className="font-semibold">{label}</span>
                              <span className="text-[9px] opacity-70">{nextInterval(currentCard, quality)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          </div>

          {/* Usage guide */}
          <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-semibold text-sm">How to use Anki Flashcards</h3>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Getting started</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li><span className="text-foreground font-medium">Create a deck</span> by clicking New. Group your cards by topic, such as "Spanish Vocab" or "Biology Terms".</li>
                <li><span className="text-foreground font-medium">Add cards</span> to your deck. Each card has a Question on the front and an Answer on the back. Keep each card to a single idea.</li>
                <li><span className="text-foreground font-medium">Study daily</span> by clicking Study to review the cards due today. Cards due appear in your queue automatically.</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Rating cards after you flip</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs" role="group" aria-label="Card rating options">
                <div className="rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1 leading-tight" aria-label="keyboard shortcut: press 1">1</kbd>
                    <p className="font-semibold text-red-600">Again</p>
                  </div>
                  <p className="text-muted-foreground">You forgot this one. The card resets and appears again tomorrow.</p>
                </div>
                <div className="rounded-md border border-orange-500/30 bg-orange-500/5 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1 leading-tight" aria-label="keyboard shortcut: press 2">2</kbd>
                    <p className="font-semibold text-orange-600">Hard</p>
                  </div>
                  <p className="text-muted-foreground">You remembered but it was tough. Your next review will be sooner than usual.</p>
                </div>
                <div className="rounded-md border border-green-500/30 bg-green-500/5 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1 leading-tight" aria-label="keyboard shortcut: press 3">3</kbd>
                    <p className="font-semibold text-green-600">Good</p>
                  </div>
                  <p className="text-muted-foreground">You remembered correctly. The gap before your next review grows at a normal rate.</p>
                </div>
                <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1 leading-tight" aria-label="keyboard shortcut: press 4">4</kbd>
                    <p className="font-semibold text-blue-600">Easy</p>
                  </div>
                  <p className="text-muted-foreground">You recalled this instantly. Your next review is scheduled far into the future.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How spaced repetition works</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This tool uses the <span className="text-foreground font-medium">SM-2 algorithm</span>, the same algorithm behind the original Anki app. Cards you know well gradually appear less often, growing from days to weeks to months between reviews. Cards you struggle with come back sooner. The goal is to review each card just before you would forget it, making your study time as efficient as possible.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                <li>One fact per card. Simpler cards are easier to recall.</li>
                <li>Study a little every day. Consistency beats long sessions.</li>
                <li>Use keyboard shortcuts: <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Space</kbd> to flip, <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> through <kbd className="rounded border border-border bg-muted px-1 text-[10px]">4</kbd> to rate.</li>
                <li>All decks and cards are saved locally in your browser.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          {decks.length > 0 && view !== "study" && (
            <Button variant="ghost" size="sm" className="h-11 px-3 text-muted-foreground hover:text-destructive" onClick={clearAllData} aria-label="Clear all decks and study history">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <div className="flex-1" />
          {view === "study" && currentCard ? (
            <>
              {!isFlipped ? (
                <Button className="h-11 flex-1" onClick={() => setIsFlipped(true)} aria-label="Show answer">
                  <Eye className="h-4 w-4 mr-1" aria-hidden="true" />Show Answer
                </Button>
              ) : (
                <>
                  <button onClick={() => rateCard(0)} className="h-11 flex-1 flex flex-col items-center justify-center gap-0.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-600 text-xs font-medium" aria-label="Rate as Again — press 1"><span className="text-[9px] font-mono opacity-60">1</span><span>Again</span></button>
                  <button onClick={() => rateCard(2)} className="h-11 flex-1 flex flex-col items-center justify-center gap-0.5 rounded-md border border-orange-500/30 bg-orange-500/10 text-orange-600 text-xs font-medium" aria-label="Rate as Hard — press 2"><span className="text-[9px] font-mono opacity-60">2</span><span>Hard</span></button>
                  <button onClick={() => rateCard(4)} className="h-11 flex-1 flex flex-col items-center justify-center gap-0.5 rounded-md border border-green-500/30 bg-green-500/10 text-green-600 text-xs font-medium" aria-label="Rate as Good — press 3"><span className="text-[9px] font-mono opacity-60">3</span><span>Good</span></button>
                  <button onClick={() => rateCard(5)} className="h-11 flex-1 flex flex-col items-center justify-center gap-0.5 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-600 text-xs font-medium" aria-label="Rate as Easy — press 4"><span className="text-[9px] font-mono opacity-60">4</span><span>Easy</span></button>
                </>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" className="h-11" onClick={() => activeDeck && setView("add-card")} disabled={!activeDeck} aria-label="Add card">
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add Card
              </Button>
              <Button className="h-11" onClick={startStudy} disabled={!activeDeck || dueCards.length === 0} aria-label="Study">
                <BookOpen className="h-4 w-4 mr-1" aria-hidden="true" />
                Study {dueCards.length > 0 && `(${dueCards.length})`}
              </Button>
            </>
          )}
        </div>

      </div>
    </>
  )
}
