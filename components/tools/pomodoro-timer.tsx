"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, RotateCcw, SkipForward, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

type Mode = "work" | "short" | "long"

interface Settings { work: number; short: number; long: number; longsAfter: number; sound: boolean; notify: boolean }

const DEFAULTS: Settings = { work: 25, short: 5, long: 15, longsAfter: 4, sound: true, notify: true }

const MODE_LABEL: Record<Mode, string> = { work: "Focus", short: "Short Break", long: "Long Break" }
const MODE_COLOR: Record<Mode, string> = {
  work: "text-red-500 dark:text-red-400",
  short: "text-green-500 dark:text-green-400",
  long: "text-blue-500 dark:text-blue-400",
}
const MODE_RING: Record<Mode, string> = {
  work: "#ef4444", short: "#22c55e", long: "#3b82f6",
}

const RADIUS = 88
const CIRC   = 2 * Math.PI * RADIUS

function playBell(vol = 0.5) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[0, 0.15, 0.3].forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = "sine"; osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.2)
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 1.3)
    })
  } catch {}
}

function notify(title: string, body: string) {
  if (typeof Notification === "undefined") return
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" })
  }
}

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [showSettings, setShowSettings] = useState(false)
  const [mode, setMode] = useState<Mode>("work")
  const [sessionInCycle, setSessionInCycle] = useState(0)
  const [totalPomos, setTotalPomos] = useState(0)
  const [running, setRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.work * 60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = useRef(settings)
  const modeRef = useRef(mode)
  const sessionRef = useRef(sessionInCycle)

  settingsRef.current = settings
  modeRef.current = mode
  sessionRef.current = sessionInCycle

  // Load from localStorage
  useEffect(() => {
    const s = localStorage.getItem("ck-pomodoro-settings")
    if (s) try { const parsed = JSON.parse(s); setSettings(parsed); setSecondsLeft(parsed.work * 60) } catch {}
    const t = localStorage.getItem("ck-pomodoro-pomos")
    if (t) setTotalPomos(parseInt(t) || 0)
  }, [])

  useEffect(() => {
    localStorage.setItem("ck-pomodoro-settings", JSON.stringify(settings))
  }, [settings])

  // Update document title
  useEffect(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0")
    const s = (secondsLeft % 60).toString().padStart(2, "0")
    document.title = running ? `${m}:${s} · ${MODE_LABEL[mode]} — CreatorKit` : "Pomodoro — CreatorKit"
    return () => { document.title = "CreatorKit" }
  }, [secondsLeft, running, mode])

  const advance = useCallback(() => {
    const s = settingsRef.current
    const cur = modeRef.current
    const sess = sessionRef.current

    if (cur === "work") {
      const newSess = sess + 1
      setTotalPomos(p => { const n = p + 1; localStorage.setItem("ck-pomodoro-pomos", String(n)); return n })
      if (newSess >= s.longsAfter) {
        setMode("long"); setSecondsLeft(s.long * 60); setSessionInCycle(0)
        notify("Long Break 🎉", `${s.longsAfter} sessions complete! Take a ${s.long}-minute break.`)
      } else {
        setMode("short"); setSecondsLeft(s.short * 60); setSessionInCycle(newSess)
        notify("Short Break ☕", `Good work! Take a ${s.short}-minute break.`)
      }
    } else {
      setMode("work"); setSecondsLeft(s.work * 60)
      notify("Focus Time 🍅", `Break over — time to focus for ${s.work} minutes!`)
    }
    setRunning(false)
  }, [])

  // Timer tick
  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (settingsRef.current.sound) playBell()
          advance()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, advance])

  const toggle = () => {
    if (!running && settings.notify && Notification.permission === "default") {
      Notification.requestPermission()
    }
    setRunning(r => !r)
  }

  const reset = () => { setRunning(false); setSecondsLeft(settings[mode] * 60) }
  const skip  = () => { setRunning(false); advance() }

  const switchMode = (m: Mode) => {
    setRunning(false); setMode(m)
    setSecondsLeft(settings[m] * 60)
    if (m === "work") setSessionInCycle(0)
  }

  const totalSecs = settings[mode] * 60
  const progress  = totalSecs > 0 ? secondsLeft / totalSecs : 1
  const dashOffset = CIRC * (1 - progress)
  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0")
  const secs = (secondsLeft % 60).toString().padStart(2, "0")

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings(s => ({ ...s, [k]: v }))
    if ((k === "work" && mode === "work") || (k === "short" && mode === "short") || (k === "long" && mode === "long")) {
      setSecondsLeft((v as number) * 60)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pomodoro Timer</h2>
          <p className="text-muted-foreground">Focus in sessions, rest in breaks. All in your browser.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(s => !s)}>
          <Settings className="h-3.5 w-3.5 mr-1.5" />Settings
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Timer */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          {/* Mode selector */}
          <div className="flex gap-1 rounded-full border border-border p-1">
            {(["work", "short", "long"] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          {/* Circular timer */}
          <div className="relative">
            <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
              <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
              <circle cx="110" cy="110" r={RADIUS} fill="none" stroke={MODE_RING[mode]} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold font-mono tabular-nums ${MODE_COLOR[mode]}`}>{mins}:{secs}</span>
              <span className="text-sm text-muted-foreground mt-1">{MODE_LABEL[mode]}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={reset} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button onClick={toggle}
              className={`rounded-full w-14 h-14 flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 ${running ? "bg-slate-600 hover:bg-slate-700" : "bg-primary hover:opacity-90"}`}>
              {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button onClick={skip} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Session dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: settings.longsAfter }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < sessionInCycle ? "bg-red-500" : "bg-muted/50 border border-border"}`} />
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{totalPomos}</p>
              <p className="text-xs text-muted-foreground">Total pomodoros</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-2xl font-bold">{Math.floor(totalPomos * settings.work / 60)}h {(totalPomos * settings.work) % 60}m</p>
              <p className="text-xs text-muted-foreground">Focus time</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <button onClick={() => { setTotalPomos(0); localStorage.setItem("ck-pomodoro-pomos", "0") }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors">Reset stats</button>
            </div>
          </div>
        </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="shrink-0 w-64 flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Settings</p>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {([
              { key: "work",   label: "Focus duration (min)",       min: 1, max: 90 },
              { key: "short",  label: "Short break (min)",           min: 1, max: 30 },
              { key: "long",   label: "Long break (min)",            min: 1, max: 60 },
              { key: "longsAfter", label: "Sessions before long break", min: 1, max: 8 },
            ] as const).map(({ key, label, min, max }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <span className="text-xs font-mono text-muted-foreground">{settings[key]}</span>
                </div>
                <Slider value={[settings[key]]} onValueChange={([v]) => setSetting(key, v)} min={min} max={max} step={1} />
              </div>
            ))}

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Sound bell</Label>
              <Switch checked={settings.sound} onCheckedChange={v => setSetting("sound", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Browser notifications</Label>
              <Switch checked={settings.notify} onCheckedChange={v => setSetting("notify", v)} />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => {
              setSettings(DEFAULTS); setSecondsLeft(DEFAULTS.work * 60); setMode("work"); setRunning(false)
            }}>Reset to defaults</Button>
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
