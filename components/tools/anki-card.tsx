"use client"

import { useState, useEffect, useCallback } from "react"
import { Brain, Plus, Trash2, BookOpen, RotateCcw } from "lucide-react"
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
    setStudyLog(loadLog())   // ← add this line
  }, [])

  const activeDeck = decks.find(d => d.id === activeDeckId) ?? null
  const dueCards = activeDeck ? activeDeck.cards.filter(isDue) : []

  useEffect(() => {
    if (!activeDeck) { setView("empty"); return }
    if (dueCards.length === 0 && view !== "add-card") { setView("done"); return }
    if (dueCards.length > 0 && view === "empty") setView("study")
  }, [activeDeckId])

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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (view === "study") {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!isFlipped) setIsFlipped(true) }
        if (isFlipped) {
          if (e.key === "1") rateCard(0)
          if (e.key === "2") rateCard(2)
          if (e.key === "3") rateCard(4)
          if (e.key === "4") rateCard(5)
        }
      }
    }
    const addHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && view === "add-card") { e.preventDefault(); addCard() }
    }
    window.addEventListener("keydown", h)
    window.addEventListener("keydown", addHandler)
    return () => { window.removeEventListener("keydown", h); window.removeEventListener("keydown", addHandler) }
  }, [view, isFlipped, rateCard, addCard])

  const currentCard = queue[currentIdx] ?? null
  if (!mounted) return null

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel — deck management */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Anki-style Flashcards</h1>
              <p className="text-xs text-muted-foreground">Spaced repetition · 100% in-browser · never synced</p>
            </div>
          </div>

          {/* Deck list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Decks</Label>
              <button
                onClick={() => setAddingDeck(v => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />New deck
              </button>
            </div>

            {addingDeck && (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Deck name…"
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createDeck(); if (e.key === "Escape") setAddingDeck(false) }}
                  className="text-sm"
                />
                <Button size="sm" onClick={createDeck} disabled={!newDeckName.trim()}>Add</Button>
              </div>
            )}

            {decks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No decks yet — create one above</p>
            ) : (
              <div className="space-y-1.5">
                {decks.map(d => {
                  const due = d.cards.filter(isDue).length
                  return (
                    <div
                      key={d.id}
                      onClick={() => setActiveDeckId(d.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                        activeDeckId === d.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.cards.length} cards</p>
                      </div>
                      {due > 0 && <Badge className="text-xs shrink-0">{due} due</Badge>}
                      <button
                        onClick={e => { e.stopPropagation(); deleteDeck(d.id) }}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Stats */}
          {activeDeck && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{activeDeck.name}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-lg font-semibold">{activeDeck.cards.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${dueCards.length > 0 ? "text-amber-500" : "text-green-500"}`}>{dueCards.length}</p>
                  <p className="text-xs text-muted-foreground">Due today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">{studiedCount}</p>
                  <p className="text-xs text-muted-foreground">Studied</p>
                </div>
              </div>
            </div>
          )}

          {Object.keys(studyLog).length > 0 && (() => {
            const today = new Date()
            const last7 = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(today)
              d.setDate(today.getDate() - (6 - i))
              const ds = d.toISOString().split("T")[0]
              return {
                label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
                count: studyLog[ds] ?? 0,
                isToday: i === 6,
              }
            })
            const maxCount = Math.max(...last7.map(d => d.count), 1)
            const totalAll = Object.values(studyLog).reduce((a, b) => a + b, 0)
            const streak = calcStreak(studyLog)
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Study History</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {streak > 0 && <span className="text-amber-500 font-medium">{streak}d streak</span>}
                    <span>{totalAll} total</span>
                  </div>
                </div>
                <div className="flex items-end gap-1 h-14 pt-1">
                  {last7.map(({ label, count, isToday }, i) => {
                    const barH = count === 0 ? 2 : Math.max(6, Math.round((count / maxCount) * 36))
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            isToday ? "bg-primary" : count > 0 ? "bg-primary/40" : "bg-muted"
                          }`}
                          style={{ height: `${barH}px` }}
                          title={`${count} card${count !== 1 ? "s" : ""}`}
                        />
                        <span className={`text-[9px] ${isToday ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Actions */}
          {activeDeck && (
            <div className="flex gap-2">
              <Button
                variant={view === "study" ? "default" : "outline"}
                size="sm" className="flex-1"
                onClick={startStudy}
                disabled={dueCards.length === 0}
              >
                Study Now {dueCards.length > 0 && `(${dueCards.length})`}
              </Button>
              <Button
                variant={view === "add-card" ? "default" : "outline"}
                size="sm" className="flex-1"
                onClick={() => setView("add-card")}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />Add Card
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — contextual */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">

          {/* Empty state */}
          {view === "empty" && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Brain className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No deck selected</p>
                <p className="text-xs text-muted-foreground mt-1">Create a deck on the left to get started</p>
              </div>
            </div>
          )}

          {/* All caught up */}
          {view === "done" && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full border border-green-500/30 bg-green-500/10 p-4">
                <Brain className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {studiedCount > 0 ? `Session complete! ${studiedCount} card${studiedCount > 1 ? "s" : ""} reviewed.` : "All caught up!"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">No cards due today. Come back tomorrow.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setView("add-card")}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Card
                </Button>
                {dueCards.length > 0 && (
                  <Button size="sm" onClick={startStudy}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />Study Again
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Add card form */}
          {view === "add-card" && (
            <div className="space-y-4 max-w-lg">
              <div>
                <p className="text-sm font-semibold">Add New Card</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adding to: <span className="font-medium">{activeDeck?.name}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Front (Question)</Label>
                <Textarea
                  placeholder="What is the capital of France?"
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  className="resize-none" rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Back (Answer)</Label>
                <Textarea
                  placeholder="Paris"
                  value={back}
                  onChange={e => setBack(e.target.value)}
                  className="resize-none" rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addCard} disabled={!front.trim() || !back.trim()} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />Add Card
                  <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]">Ctrl+Enter</kbd>
                </Button>
                {dueCards.length > 0 && (
                  <Button variant="outline" onClick={startStudy}>Study</Button>
                )}
              </div>

              {activeDeck && activeDeck.cards.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">All cards ({activeDeck.cards.length})</p>
                  {activeDeck.cards.map(c => (
                    <div key={c.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.front}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.back}</p>
                      </div>
                      <button
                        onClick={() => deleteCard(c.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Study mode */}
          {view === "study" && currentCard && (
            <div className="flex flex-col h-full min-h-[300px] gap-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Card {currentIdx + 1} of {queue.length}</span>
                <span>{studiedCount} reviewed this session</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-full rounded-xl border border-border bg-muted/20 p-6 min-h-[160px] flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {isFlipped ? "Answer" : "Question"}
                  </p>
                  <p className="text-xl font-medium leading-relaxed whitespace-pre-wrap">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </div>

                {!isFlipped ? (
                  <Button className="w-full max-w-xs" onClick={() => setIsFlipped(true)}>
                    Show Answer
                    <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]">Space</kbd>
                  </Button>
                ) : (
                  <div className="w-full space-y-2">
                    <p className="text-xs text-center text-muted-foreground">How well did you remember?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Again", quality: 0,  color: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",    key: "1" },
                        { label: "Hard",  quality: 2,  color: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20", key: "2" },
                        { label: "Good",  quality: 4,  color: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20",  key: "3" },
                        { label: "Easy",  quality: 5,  color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",    key: "4" },
                      ].map(({ label, quality, color, key }) => (
                        <button
                          key={label}
                          onClick={() => rateCard(quality)}
                          className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${color}`}
                        >
                          <span>{label}</span>
                          <span className="text-[10px] opacity-70">{nextInterval(currentCard, quality)}</span>
                          <kbd className="text-[9px] opacity-50">[{key}]</kbd>
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

      <ShortcutsModal
        pageName="Anki Flashcards"
        shortcuts={[
          { keys: ["Space"], description: "Flip card / Show answer" },
          { keys: ["1"], description: "Rate: Again" },
          { keys: ["2"], description: "Rate: Hard" },
          { keys: ["3"], description: "Rate: Good" },
          { keys: ["4"], description: "Rate: Easy" },
          { keys: ["Ctrl", "Enter"], description: "Add card (in Add Card view)" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
