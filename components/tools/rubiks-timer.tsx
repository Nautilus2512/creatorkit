"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const FACES = ["U", "D", "L", "R", "F", "B"]
const MODS = ["", "'", "2"]
const OPPOSITES: Record<string, string> = { U: "D", D: "U", L: "R", R: "L", F: "B", B: "F" }

function scramble(len = 20) {
  const moves: string[] = []
  let last = "", secondLast = ""
  for (let i = 0; i < len; i++) {
    let face: string
    do { face = FACES[Math.floor(Math.random() * 6)] }
    while (face === last || face === OPPOSITES[last] && face === secondLast)
    moves.push(face + MODS[Math.floor(Math.random() * 3)])
    secondLast = last; last = face
  }
  return moves.join(" ")
}

function fmt(ms: number) {
  if (ms < 0) return "0.00"
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return min > 0
    ? `${min}:${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`
    : `${sec}.${cs.toString().padStart(2, "0")}`
}

function trimmedAvg(times: number[], n: number) {
  if (times.length < n) return "--"
  const slice = times.slice(-n).sort((a, b) => a - b)
  const trimmed = slice.slice(1, -1)
  return fmt(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

type Phase = "idle" | "inspecting" | "running" | "stopped"

export default function RubiksTimer() {
  const [currentScramble, setCurrentScramble] = useState(() => scramble())
  const [phase, setPhase] = useState<Phase>("idle")
  const [displayMs, setDisplayMs] = useState(0)
  const [inspection, setInspection] = useState(15)
  const [solves, setSolves] = useState<number[]>([])
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const inspRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    setDisplayMs(Date.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startTimer = useCallback(() => {
    startRef.current = Date.now()
    setPhase("running")
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopTimer = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const elapsed = Date.now() - startRef.current
    setDisplayMs(elapsed)
    setSolves(prev => [...prev, elapsed])
    setPhase("stopped")
    setCurrentScramble(scramble())
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      if (phase === "idle" || phase === "stopped") {
        setInspection(15)
        setDisplayMs(0)
        setPhase("inspecting")
        inspRef.current = setInterval(() => {
          setInspection(p => {
            if (p <= 1) { clearInterval(inspRef.current!); startTimer(); return 0 }
            return p - 1
          })
        }, 1000)
      } else if (phase === "inspecting") {
        clearInterval(inspRef.current!)
        startTimer()
      } else if (phase === "running") {
        stopTimer()
      }
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [phase, startTimer, stopTimer])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearInterval(inspRef.current!) }, [])

  const best = solves.length ? fmt(Math.min(...solves)) : "--"
  const ao5 = trimmedAvg(solves, 5)
  const ao12 = trimmedAvg(solves, 12)

  const timerColor =
    phase === "inspecting" ? "text-yellow-500" :
    phase === "running" ? "text-foreground" : "text-foreground"

  const hint =
    phase === "idle" ? "Press Space to start inspection" :
    phase === "inspecting" ? `Inspection: ${inspection}s` :
    phase === "running" ? "Press Space to stop" :
    "Press Space for next solve"

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Rubik's Cube Timer</h1>
            <p className="text-sm text-muted-foreground">Space to start inspection → Space to start timer → Space to stop.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentScramble(scramble())}>
            <RefreshCw className="h-4 w-4 mr-1" />New Scramble
          </Button>
        </div>
      </div>

      {/* Scramble */}
      <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-4">
        <p className="font-mono text-sm text-center tracking-widest">{currentScramble}</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Timer area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 select-none">
          <div
            className={`text-8xl font-bold font-mono tabular-nums transition-colors cursor-pointer ${timerColor}`}
            onClick={() => { if (phase === "running") stopTimer() }}
          >
            {phase === "inspecting" ? inspection : fmt(displayMs)}
          </div>

          <p className="text-sm text-muted-foreground">{hint}</p>

          <div className="flex gap-10 text-center mt-4">
            {[
              { label: "Best", value: best },
              { label: "Ao5", value: ao5 },
              { label: "Ao12", value: ao12 },
              { label: "Solves", value: String(solves.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-mono font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* History sidebar */}
        {solves.length > 0 && (
          <div className="w-48 flex flex-col border-l border-border shrink-0">
            <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSolves([])}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {[...solves].reverse().map((t, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-border/50 text-sm">
                  <span className="text-xs text-muted-foreground">{solves.length - i}</span>
                  <span className="font-mono">{fmt(t)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
