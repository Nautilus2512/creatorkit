"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, Square, Play, Pause, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface Recording {
  id: number
  url: string
  blob: Blob
  duration: number
  timestamp: Date
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
          case "r":
            if (!isRecording) {
              e.preventDefault()
              startRecording()
            }
            break
          case "s":
            if (isRecording) {
              e.preventDefault()
              stopRecording()
            }
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, startRecording, stopRecording])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "R"], description: "Start recording" },
    { keys: ["Ctrl", "Shift", "S"], description: "Stop recording" },
  ]

  useEffect(() => () => { clearInterval(timerRef.current!); audioRef.current?.pause() }, [])

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Voice Recorder</h2>
          <p className="text-muted-foreground">Record audio in your browser. Nothing is uploaded — recordings stay on your device.</p>
        </div>
        <ShortcutsModal pageName="Voice Recorder" shortcuts={shortcuts} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Recorder */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Recorder panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Recorder</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div 
              className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? "border-destructive bg-destructive/10 animate-pulse" : "border-border bg-muted/30"}`}
              role="img"
              aria-label={isRecording ? `Recording in progress: ${fmtDur(duration)}` : "Microphone ready"}
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
              {isRecording ? <><Square className="h-5 w-5 mr-2" aria-hidden="true" /><span>Stop</span><kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm"><span>Ctrl</span><span>Shift</span><span>S</span></kbd></> : <><Mic className="h-5 w-5 mr-2" aria-hidden="true" /><span>Start Recording</span><kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm"><span>Ctrl</span><span>Shift</span><span>R</span></kbd></>}
            </Button>
          </div>
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground" role="note">
            Recordings are in-memory only — download to save before leaving this page.
          </div>
        </div>

        {/* Right — Recordings list */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Recordings list panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="recordings-label">Recordings ({recordings.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto" role="list" aria-label="Recorded audio files">
            {recordings.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="status">Recordings will appear here</div>
            ) : (
              <div className="divide-y divide-border">
                {[...recordings].reverse().map((rec) => (
                  <div key={rec.id} className="flex items-center gap-4 px-4 py-3" role="listitem" aria-label={`Recording ${rec.id}: ${fmtDur(rec.duration)}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-9 h-9 p-0 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      onClick={() => togglePlay(rec)}
                      aria-label={playingId === rec.id ? `Pause recording ${rec.id}` : `Play recording ${rec.id}`}
                    >
                      {playingId === rec.id ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Recording {rec.id}</p>
                      <p className="text-xs text-muted-foreground">{rec.timestamp.toLocaleTimeString()} · {fmtDur(rec.duration)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0" role="group" aria-label="Recording actions">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => download(rec)}
                        aria-label={`Download recording ${rec.id}`}
                        className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => remove(rec.id)} 
                        className="text-muted-foreground hover:text-destructive focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label={`Delete recording ${rec.id}`}
                      >
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
    </div>
  )
}
