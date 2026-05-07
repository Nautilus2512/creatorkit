"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, Play, Pause, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startRef = useRef(0)

  const startRecording = async () => {
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
      }
      mr.start()
      mediaRef.current = mr
      startRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)
      setError("")
      timerRef.current = setInterval(() => setDuration(Math.round((Date.now() - startRef.current) / 1000)), 500)
    } catch {
      setError("Microphone access denied. Please allow microphone access in your browser settings.")
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    clearInterval(timerRef.current!)
    setIsRecording(false)
    setDuration(0)
  }

  const togglePlay = (rec: Recording) => {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      audioRef.current?.pause()
      const audio = new Audio(rec.url)
      audio.onended = () => setPlayingId(null)
      audio.play()
      audioRef.current = audio
      setPlayingId(rec.id)
    }
  }

  const download = (rec: Recording) => {
    const a = document.createElement("a")
    a.href = rec.url
    a.download = `recording-${rec.timestamp.toISOString().slice(0, 19).replace(/[T:]/g, "-")}.webm`
    a.click()
  }

  const remove = (id: number) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null) }
    setRecordings(prev => prev.filter(r => r.id !== id))
  }

  useEffect(() => () => { clearInterval(timerRef.current!); audioRef.current?.pause() }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Voice Recorder</h1>
          <p className="text-sm text-muted-foreground">Record audio in your browser. Nothing is uploaded — recordings stay on your device.</p>
        </div>
      </div>

      {/* Recorder */}
      <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-8 flex flex-col items-center gap-5">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? "border-destructive bg-destructive/10 animate-pulse" : "border-border bg-muted/30"}`}>
          <Mic className={`h-10 w-10 ${isRecording ? "text-destructive" : "text-muted-foreground"}`} />
        </div>

        {isRecording && (
          <p className="text-2xl font-mono font-bold text-destructive tabular-nums">{fmtDur(duration)}</p>
        )}

        {error && <p className="text-xs text-destructive text-center max-w-xs">{error}</p>}

        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          onClick={isRecording ? stopRecording : startRecording}
          className="min-w-40"
        >
          {isRecording
            ? <><Square className="h-5 w-5 mr-2" />Stop</>
            : <><Mic className="h-5 w-5 mr-2" />Start Recording</>
          }
        </Button>
      </div>

      {/* Recordings list */}
      <div className="flex-1 overflow-y-auto">
        {recordings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Recordings will appear here
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...recordings].reverse().map((rec) => (
              <div key={rec.id} className="flex items-center gap-4 px-6 py-4">
                <Button variant="outline" size="sm" className="w-9 h-9 p-0 shrink-0" onClick={() => togglePlay(rec)}>
                  {playingId === rec.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Recording {rec.id}</p>
                  <p className="text-xs text-muted-foreground">{rec.timestamp.toLocaleTimeString()} · {fmtDur(rec.duration)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => download(rec)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(rec.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground">
        Recordings are in-memory only — download to save before leaving this page.
      </div>
    </div>
  )
}
