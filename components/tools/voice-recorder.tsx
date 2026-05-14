"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, Square, Play, Pause, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface Recording {
  id: number; url: string; blob: Blob; duration: number; timestamp: Date
}

let recId = 1

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
}

export default function VoiceRecorder() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startRef = useRef(0)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        const dur = Math.round((Date.now() - startRef.current) / 1000)
        setRecordings(prev => [...prev, { id: recId++, url, blob, duration: dur, timestamp: new Date() }])
        stream.getTracks().forEach(t => t.stop())
        setActiveTab("output")
        announceToScreenReader(`Recording saved: ${fmtDur(dur)}`)
      }
      mr.start()
      mediaRef.current = mr
      startRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)
      setError("")
      announceToScreenReader("Recording started")
      timerRef.current = setInterval(() => setDuration(Math.round((Date.now() - startRef.current) / 1000)), 500)
    } catch {
      setError("Microphone access denied. Please allow microphone access in your browser settings.")
      announceToScreenReader("Microphone access denied")
    }
  }, [announceToScreenReader])

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop()
    clearInterval(timerRef.current!)
    setIsRecording(false)
    setDuration(0)
    announceToScreenReader("Recording stopped")
  }, [announceToScreenReader])

  const togglePlay = useCallback((rec: Recording) => {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      announceToScreenReader("Playback paused")
    } else {
      audioRef.current?.pause()
      const audio = new Audio(rec.url)
      audio.onended = () => setPlayingId(null)
      audio.play()
      audioRef.current = audio
      setPlayingId(rec.id)
      announceToScreenReader(`Playing recording ${rec.id}`)
    }
  }, [playingId, announceToScreenReader])

  const download = useCallback((rec: Recording) => {
    const a = document.createElement("a")
    a.href = rec.url
    a.download = `recording-${rec.timestamp.toISOString().slice(0, 19).replace(/[T:]/g, "-")}.webm`
    a.click()
    announceToScreenReader(`Downloaded recording ${rec.id}`)
  }, [announceToScreenReader])

  const remove = useCallback((id: number) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null) }
    setRecordings(prev => prev.filter(r => r.id !== id))
    announceToScreenReader(`Deleted recording ${id}`)
  }, [playingId, announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "r": if (!isRecording) { e.preventDefault(); startRecording() } break
          case "s": if (isRecording) { e.preventDefault(); stopRecording() } break
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isRecording, startRecording, stopRecording])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "R"], description: "Start recording" },
    { keys: ["Ctrl", "Shift", "S"], description: "Stop recording" },
  ]

  useEffect(() => () => { clearInterval(timerRef.current!); audioRef.current?.pause() }, [])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <div className="flex flex-1 flex-col min-h-0">

        {/* â”€â”€ Desktop: top action bar â”€â”€ */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Voice recorder controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Voice Recorder</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Voice Recorder" shortcuts={shortcuts} />
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording
                ? <><Square className="h-4 w-4 mr-1" aria-hidden="true" />Stop<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd></>
                : <><Mic className="h-4 w-4 mr-1" aria-hidden="true" />Record<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+R</kbd></>}
            </Button>
          </div>
        </div>

        {/* â”€â”€ Mobile: compact header + tab switcher â”€â”€ */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Voice Recorder</h2>
            <ShortcutsModal pageName="Voice Recorder" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Record
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Recordings ({recordings.length})
            </button>
          </div>
        </div>

        {/* â”€â”€ Panels â”€â”€ */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Recorder panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Recorder panel">
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? "border-destructive bg-destructive/10 animate-pulse" : "border-border bg-muted/30"}`}
                role="img"
                aria-label={isRecording ? `Recording: ${fmtDur(duration)}` : "Microphone ready"}
              >
                <Mic className={`h-10 w-10 ${isRecording ? "text-destructive" : "text-muted-foreground"}`} aria-hidden="true" />
              </div>
              {isRecording && <p className="text-2xl font-mono font-bold text-destructive tabular-nums" aria-live="polite" aria-atomic="true">{fmtDur(duration)}</p>}
              {error && <p className="text-xs text-destructive text-center max-w-xs" role="alert" aria-live="assertive">{error}</p>}
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                className="min-w-40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording
                  ? <><Square className="h-5 w-5 mr-2" aria-hidden="true" /><span>Stop</span></>
                  : <><Mic className="h-5 w-5 mr-2" aria-hidden="true" /><span>Start Recording</span></>}
              </Button>
            </div>
            <div className="shrink-0 border-t border-border bg-card/95 px-4 py-2 text-xs text-muted-foreground" role="note">
              Recordings are in-memory only â€” download to save before leaving this page.
            </div>
          </div>

          {/* Recordings list panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Recordings list panel">
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Recorded audio files">
              {recordings.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="status">Recordings will appear here</div>
              ) : (
                <div className="divide-y divide-border">
                  {[...recordings].reverse().map((rec) => (
                    <div key={rec.id} className="flex items-center gap-4 px-4 py-3" role="listitem" aria-label={`Recording ${rec.id}: ${fmtDur(rec.duration)}`}>
                      <Button variant="outline" size="sm" className="w-9 h-9 p-0 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50" onClick={() => togglePlay(rec)} aria-label={playingId === rec.id ? `Pause recording ${rec.id}` : `Play recording ${rec.id}`}>
                        {playingId === rec.id ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Recording {rec.id}</p>
                        <p className="text-xs text-muted-foreground">{rec.timestamp.toLocaleTimeString()} Â· {fmtDur(rec.duration)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0" role="group" aria-label="Recording actions">
                        <Button variant="ghost" size="sm" onClick={() => download(rec)} aria-label={`Download recording ${rec.id}`} className="focus:outline-none focus:ring-2 focus:ring-primary/50">
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(rec.id)} className="text-muted-foreground hover:text-destructive focus:outline-none focus:ring-2 focus:ring-primary/50" aria-label={`Delete recording ${rec.id}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* â”€â”€ Mobile: bottom action bar â”€â”€ */}
        <div
          className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-11 px-5"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording
              ? <><Square className="h-4 w-4 mr-1.5" aria-hidden="true" />Stop</>
              : <><Mic className="h-4 w-4 mr-1.5" aria-hidden="true" />Record</>}
          </Button>
        </div>

      </div>
    </>
  )
}
