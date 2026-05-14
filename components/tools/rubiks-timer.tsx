"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface Solve {
  id: string
  ms: number
  penalty: "none" | "+2" | "dnf"
  scramble: string
}

type Phase =
  | "idle" | "holding" | "ready" | "inspecting"
  | "insp-holding" | "insp-ready" | "running" | "stopped"

const FACES = ["U", "D", "L", "R", "F", "B"]
const MODS = ["", "'", "2"]
const OPP: Record<string, string> = { U: "D", D: "U", L: "R", R: "L", F: "B", B: "F" }

function genScramble(len = 20): string {
  const moves: string[] = []
  let last = "", prev = ""
  for (let i = 0; i < len; i++) {
    let face: string
    do { face = FACES[Math.floor(Math.random() * 6)] }
    while (face === last || (OPP[face] === last && face === prev))
    moves.push(face + MODS[Math.floor(Math.random() * 3)])
    prev = last; last = face
  }
  return moves.join(" ")
}

function fmt(ms: number): string {
  if (ms <= 0) return "0.00"
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return min > 0
    ? `${min}:${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`
    : `${sec}.${cs.toString().padStart(2, "0")}`
}

function fmtSolve(s: Solve): string {
  if (s.penalty === "dnf") return "DNF"
  const ms = s.penalty === "+2" ? s.ms + 2000 : s.ms
  return fmt(ms) + (s.penalty === "+2" ? "+" : "")
}

function effectiveMs(s: Solve): number | null {
  if (s.penalty === "dnf") return null
  return s.penalty === "+2" ? s.ms + 2000 : s.ms
}

function calcBest(solves: Solve[]): string {
  const valid = solves.map(effectiveMs).filter((ms): ms is number => ms !== null)
  return valid.length ? fmt(Math.min(...valid)) : "--"
}

function calcAo(solves: Solve[], n: number): string {
  if (solves.length < n) return "--"
  const last = solves.slice(-n)
  const effs = last.map(effectiveMs)
  const dnfCount = effs.filter(ms => ms === null).length
  if (dnfCount > 1) return "DNF"
  const sorted = effs.map(ms => ms ?? Infinity).sort((a, b) => a - b)
  const trimmed = sorted.slice(1, -1)
  if (trimmed.includes(Infinity)) return "DNF"
  return fmt(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

const STORAGE_KEY = "creatorkit-rubiks-session"
const INSP_KEY = "creatorkit-rubiks-inspection"

function loadSolves(): Solve[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") } catch { return [] }
}
function saveSolves(solves: Solve[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(solves)) } catch {}
}

export default function RubiksTimer() {
  const [scramble, setScramble] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [displayMs, setDisplayMs] = useState(0)
  const [inspSecs, setInspSecs] = useState(15)
  const [inspEnabled, setInspEnabled] = useState(true)
  const [solves, setSolves] = useState<Solve[]>([])
  const [lastSolveId, setLastSolveId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const phaseRef = useRef<Phase>("idle")
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const isRunningRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inspTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrambleRef = useRef("")
  const inspEnabledRef = useRef(true)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { scrambleRef.current = scramble }, [scramble])
  useEffect(() => { inspEnabledRef.current = inspEnabled }, [inspEnabled])

  useEffect(() => {
    setSolves(loadSolves())
    setScramble(genScramble())
    const savedInsp = localStorage.getItem(INSP_KEY)
    if (savedInsp !== null) setInspEnabled(savedInsp === "true")
  }, [])

  const toggleInspection = (val: boolean) => {
    setInspEnabled(val)
    localStorage.setItem(INSP_KEY, String(val))
  }

  const tick = useCallback(() => {
    if (!isRunningRef.current) return
    setDisplayMs(Date.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startTimer = useCallback(() => {
    clearInterval(inspTimerRef.current!)
    startRef.current = Date.now()
    isRunningRef.current = true
    setPhase("running"); phaseRef.current = "running"
    rafRef.current = requestAnimationFrame(tick)
    announceToScreenReader("Timer started")
  }, [tick, announceToScreenReader])

  const stopTimer = useCallback(() => {
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)
    const elapsed = Date.now() - startRef.current
    setDisplayMs(elapsed)
    const id = crypto.randomUUID()
    const newSolve: Solve = { id, ms: elapsed, penalty: "none", scramble: scrambleRef.current }
    setSolves(prev => { const u = [...prev, newSolve]; saveSolves(u); return u })
    setLastSolveId(id)
    setPhase("stopped"); phaseRef.current = "stopped"
    setScramble(genScramble())
    announceToScreenReader(`Timer stopped: ${fmt(elapsed)}`)
  }, [announceToScreenReader])

  const startInspection = useCallback(() => {
    clearInterval(inspTimerRef.current!)
    setInspSecs(15); setDisplayMs(0); setLastSolveId(null)
    setPhase("inspecting"); phaseRef.current = "inspecting"
    announceToScreenReader("Inspection started, 15 seconds")
    inspTimerRef.current = setInterval(() => {
      setInspSecs(prev => {
        if (prev <= 1) { clearInterval(inspTimerRef.current!); startTimer(); return 0 }
        return prev - 1
      })
    }, 1000)
  }, [startTimer, announceToScreenReader])

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isTouchHoldingRef = useRef(false)

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      e.preventDefault()
      const p = phaseRef.current
      if (p === "running") { stopTimer(); return }
      if (p === "idle" || p === "stopped") {
        if (inspEnabledRef.current) {
          startInspection()
        } else {
          setLastSolveId(null); setDisplayMs(0)
          setPhase("holding"); phaseRef.current = "holding"
          holdTimerRef.current = setTimeout(() => { setPhase("ready"); phaseRef.current = "ready" }, 300)
        }
        return
      }
      if (p === "inspecting") {
        setPhase("insp-holding"); phaseRef.current = "insp-holding"
        holdTimerRef.current = setTimeout(() => { setPhase("insp-ready"); phaseRef.current = "insp-ready" }, 300)
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      const p = phaseRef.current
      if (p === "holding") { clearTimeout(holdTimerRef.current!); setPhase("idle"); phaseRef.current = "idle" }
      else if (p === "ready") { startTimer() }
      else if (p === "insp-holding") { clearTimeout(holdTimerRef.current!); startTimer() }
      else if (p === "insp-ready") { startTimer() }
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp) }
  }, [startTimer, stopTimer, startInspection])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault()
            if (phase !== "running" && !isInspPhase) { setScramble(genScramble()); announceToScreenReader("New scramble generated") }
            break
          case "c":
            if (solves.length > 0) { e.preventDefault(); setSolves([]); saveSolves([]); setLastSolveId(null); announceToScreenReader("Session cleared") }
            break
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [phase, solves.length])

  const shortcuts = [
    { keys: ["Space"], description: "Start/Stop timer (or inspection)" },
    { keys: ["Ctrl", "Shift", "S"], description: "Generate new scramble" },
    { keys: ["Ctrl", "Shift", "C"], description: "Clear session" },
  ]

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isTouchHoldingRef.current = true
    const p = phaseRef.current
    if (p === "running") { stopTimer(); return }
    if (p === "idle" || p === "stopped") {
      if (inspEnabledRef.current) { startInspection() }
      else {
        setLastSolveId(null); setDisplayMs(0)
        setPhase("holding"); phaseRef.current = "holding"
        holdTimerRef.current = setTimeout(() => { setPhase("ready"); phaseRef.current = "ready" }, 300)
      }
      return
    }
    if (p === "inspecting") {
      setPhase("insp-holding"); phaseRef.current = "insp-holding"
      holdTimerRef.current = setTimeout(() => { setPhase("insp-ready"); phaseRef.current = "insp-ready" }, 300)
    }
  }, [startTimer, stopTimer, startInspection])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    isTouchHoldingRef.current = false; touchStartRef.current = null
    const p = phaseRef.current
    if (p === "holding") { clearTimeout(holdTimerRef.current!); setPhase("idle"); phaseRef.current = "idle" }
    else if (p === "ready") { startTimer() }
    else if (p === "insp-holding") { clearTimeout(holdTimerRef.current!); startTimer() }
    else if (p === "insp-ready") { startTimer() }
  }, [startTimer])

  useEffect(() => () => {
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearTimeout(holdTimerRef.current!)
    clearInterval(inspTimerRef.current!)
  }, [])

  const setPenalty = useCallback((id: string, penalty: Solve["penalty"]) => {
    setSolves(prev => { const u = prev.map(s => s.id === id ? { ...s, penalty } : s); saveSolves(u); return u })
    announceToScreenReader(`Penalty set to ${penalty === "none" ? "OK" : penalty}`)
  }, [announceToScreenReader])

  const deleteSolve = useCallback((id: string) => {
    setSolves(prev => { const u = prev.filter(s => s.id !== id); saveSolves(u); return u })
    if (lastSolveId === id) setLastSolveId(null)
    announceToScreenReader("Solve deleted")
  }, [lastSolveId, announceToScreenReader])

  const clearSession = useCallback(() => {
    setSolves([]); saveSolves([]); setLastSolveId(null)
    announceToScreenReader("Session cleared")
  }, [announceToScreenReader])

  const isInspPhase = phase === "inspecting" || phase === "insp-holding" || phase === "insp-ready"
  const timerDisplay = isInspPhase ? String(inspSecs) : fmt(displayMs)
  const timerColor =
    phase === "holding"      ? "text-red-500" :
    phase === "ready"        ? "text-green-500" :
    phase === "inspecting"   ? "text-yellow-500" :
    phase === "insp-holding" ? "text-orange-500" :
    phase === "insp-ready"   ? "text-green-500" : "text-foreground"

  const hint = (() => {
    if (phase === "idle" || phase === "stopped") return inspEnabled ? "Press Space to start 15s inspection" : "Hold Space to get ready"
    if (phase === "holding")      return "Keep holding…"
    if (phase === "ready")        return "Release Space to start!"
    if (phase === "inspecting")   return "Press Space to start · or hold Space → release"
    if (phase === "insp-holding") return "Keep holding…"
    if (phase === "insp-ready")   return "Release Space to start!"
    if (phase === "running")      return "Press Space to stop"
    return "Hold Space for next solve"
  })()

  const lastSolve = lastSolveId ? solves.find(s => s.id === lastSolveId) : null

  return (
    <div className="flex h-full flex-col select-none" tabIndex={-1}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {/* ── Desktop: top action bar ── */}
      <div className="hidden md:flex shrink-0 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Rubik's Cube Timer</span>
        <div className="flex items-center gap-2">
          <Switch id="inspection-toggle-d" checked={inspEnabled} onCheckedChange={(val) => { toggleInspection(val); announceToScreenReader(val ? "Inspection enabled" : "Inspection disabled") }} disabled={phase === "running" || isInspPhase} aria-label="Enable 15 second inspection" />
          <Label htmlFor="inspection-toggle-d" className="text-sm cursor-pointer">15s Inspection</Label>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Rubik's Timer" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={() => { setScramble(genScramble()); announceToScreenReader("New scramble generated") }} disabled={phase === "running" || isInspPhase} aria-label="Generate new scramble">
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />New Scramble
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        </div>
      </div>

      {/* ── Mobile: compact header ── */}
      <div className="flex md:hidden shrink-0 items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold">Rubik's Cube Timer</h2>
        <div className="flex items-center gap-1.5">
          <ShortcutsModal pageName="Rubik's Timer" shortcuts={shortcuts} />
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-3">
          <p className="font-mono text-sm text-center tracking-widest leading-relaxed">{scramble || "Loading…"}</p>
        </div>
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 overflow-y-auto" role="timer" aria-label={`Timer: ${timerDisplay}${phase === "running" ? ", running" : ""}`}>
            <div
              className={`font-bold font-mono tabular-nums transition-colors cursor-pointer leading-none ${timerColor} ${isInspPhase ? "text-9xl" : "text-8xl"} touch-manipulation select-none focus:outline-none focus:ring-4 focus:ring-primary/30 rounded-lg`}
              onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
              role="button" tabIndex={0}
              aria-label={`Timer display: ${timerDisplay}. Touch or press Space to control timer.`}
            >
              {timerDisplay}
            </div>
            {isInspPhase && <p className="text-sm font-medium text-muted-foreground -mt-2" aria-live="polite">{inspSecs} seconds remaining</p>}
            <p className="text-sm text-muted-foreground" aria-live="polite">{hint}</p>
            {phase === "stopped" && lastSolve && (
              <div className="flex items-center gap-3" role="group" aria-label="Penalty options">
                <span className="text-xs text-muted-foreground">Penalty:</span>
                {(["none", "+2", "dnf"] as const).map(p => (
                  <button key={p} onClick={() => setPenalty(lastSolve.id, p)} role="radio" aria-checked={lastSolve.penalty === p} aria-label={p === "none" ? "No penalty" : `Penalty: ${p}`}
                    className={`text-xs px-3 py-1.5 rounded-full border font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${lastSolve.penalty === p ? p === "dnf" ? "bg-destructive text-destructive-foreground border-destructive" : p === "+2" ? "bg-yellow-500 text-white border-yellow-500" : "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {p === "none" ? "OK" : p}
                  </button>
                ))}
                <span className="text-sm font-mono ml-2 text-muted-foreground">{fmtSolve(lastSolve)}</span>
              </div>
            )}
            <div className="flex gap-10 text-center mt-4" role="region" aria-label="Statistics">
              {[
                { label: "Best",  value: calcBest(solves),      aria: "Best time" },
                { label: "Ao5",   value: calcAo(solves, 5),     aria: "Average of 5" },
                { label: "Ao12",  value: calcAo(solves, 12),    aria: "Average of 12" },
                { label: "Count", value: String(solves.length), aria: `${solves.length} solves` },
              ].map(({ label, value, aria }) => (
                <div key={label}>
                  <p className="text-2xl font-mono font-bold" aria-label={aria}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
          {solves.length > 0 && (
            <div className="flex flex-col border-t md:border-t-0 md:border-l border-border md:w-52 md:shrink-0" role="region" aria-label="Solve history">
              <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session ({solves.length})</h3>
                <button onClick={clearSession} className="text-xs text-muted-foreground hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/50 rounded px-1" aria-label="Clear all solves">Clear all</button>
              </div>
              <div className="flex-1 overflow-y-auto" role="list">
                {[...solves].reverse().map((s, i) => (
                  <div key={s.id} role="listitem" aria-label={`Solve ${solves.length - i}: ${fmtSolve(s)}`}
                    className={`flex items-center px-3 py-2 border-b border-border/50 text-sm group ${s.id === lastSolveId ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                    <span className="text-xs text-muted-foreground w-6 shrink-0">{solves.length - i}</span>
                    <span className={`font-mono flex-1 text-center ${s.penalty === "dnf" ? "text-destructive" : s.penalty === "+2" ? "text-yellow-600" : ""}`}>{fmtSolve(s)}</span>
                    <button onClick={() => deleteSolve(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 ml-1" title="Delete solve">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: bottom action bar ── */}
      <div
        className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <Switch id="inspection-toggle-m" checked={inspEnabled} onCheckedChange={toggleInspection} disabled={phase === "running" || isInspPhase} aria-label="15s Inspection" />
          <Label htmlFor="inspection-toggle-m" className="text-xs cursor-pointer">Inspection</Label>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-11 px-4" onClick={() => { setScramble(genScramble()); announceToScreenReader("New scramble generated") }} disabled={phase === "running" || isInspPhase} aria-label="New scramble">
          <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />Scramble
        </Button>
      </div>
    </div>
  )
}
