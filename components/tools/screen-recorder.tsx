"use client"

import { useState, useRef } from "react"
import { Monitor, Square, Download, Trash2, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface Recording { id: number; url: string; blob: Blob; duration: number; timestamp: Date }

let recId = 1

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
}

export default function ScreenRecorder() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [withAudio, setWithAudio] = useState(true)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  const start = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: withAudio,
      })
      let stream = displayStream
      if (withAudio) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const ctx = new AudioContext()
          const dest = ctx.createMediaStreamDestination()
          if (displayStream.getAudioTracks().length > 0)
            ctx.createMediaStreamSource(displayStream).connect(dest)
          ctx.createMediaStreamSource(micStream).connect(dest)
          stream = new MediaStream([...displayStream.getVideoTracks(), ...dest.stream.getAudioTracks()])
        } catch { /* mic denied, continue without */ }
      }

      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        const dur = Math.round((Date.now() - startRef.current) / 1000)
        setRecordings(prev => [...prev, { id: recId++, url, blob, duration: dur, timestamp: new Date() }])
      }

      displayStream.getVideoTracks()[0].onended = () => stop()

      mr.start(1000)
      mediaRef.current = mr
      startRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)
      setError("")
      timerRef.current = setInterval(() => setDuration(Math.round((Date.now() - startRef.current) / 1000)), 500)
    } catch (e: any) {
      if (e.name !== "NotAllowedError") setError("Could not start screen recording. Check permissions.")
    }
  }

  const stop = () => {
    mediaRef.current?.stop()
    clearInterval(timerRef.current!)
    setIsRecording(false)
    setDuration(0)
    if (previewRef.current) previewRef.current.srcObject = null
  }

  const togglePlay = (rec: Recording) => {
    if (playingId === rec.id) {
      videoRef.current?.pause()
      setPlayingId(null)
    } else {
      setPlayingId(rec.id)
    }
  }

  const download = (rec: Recording) => {
    const a = Object.assign(document.createElement("a"), {
      href: rec.url,
      download: `screen-recording-${rec.timestamp.toISOString().slice(0, 19).replace(/[T:]/g, "-")}.webm`,
    })
    a.click()
  }

  const remove = (id: number) => {
    if (playingId === id) { videoRef.current?.pause(); setPlayingId(null) }
    setRecordings(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Screen Recorder</h2>
        <p className="text-muted-foreground">Record your screen directly in the browser. Recordings stay on your device.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Recorder */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Recorder</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? "border-destructive bg-destructive/10 animate-pulse" : "border-border bg-muted/30"}`}>
          <Monitor className={`h-10 w-10 ${isRecording ? "text-destructive" : "text-muted-foreground"}`} />
        </div>

        {isRecording && (
          <p className="text-2xl font-mono font-bold text-destructive tabular-nums">{fmtDur(duration)}</p>
        )}

        {error && <p className="text-xs text-destructive text-center max-w-xs">{error}</p>}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="audio" checked={withAudio} onCheckedChange={setWithAudio} disabled={isRecording} />
            <Label htmlFor="audio" className="text-sm">Record audio</Label>
          </div>
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stop : start}
            className="min-w-44"
          >
            {isRecording
              ? <><Square className="h-5 w-5 mr-2" />Stop Recording</>
              : <><Monitor className="h-5 w-5 mr-2" />Start Recording</>
            }
          </Button>
        </div>
      </div>

          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground">
            Recordings are in-memory only — download to save. Saved as WebM.
          </div>
        </div>

        {/* Right — Recordings */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Recordings ({recordings.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {recordings.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Recordings will appear here</div>
            ) : (
              <div className="divide-y divide-border">
                {[...recordings].reverse().map(rec => (
                  <div key={rec.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Recording {rec.id}</p>
                        <p className="text-xs text-muted-foreground">{rec.timestamp.toLocaleTimeString()} · {fmtDur(rec.duration)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => togglePlay(rec)}>
                          {playingId === rec.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => download(rec)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(rec.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {playingId === rec.id && (
                      <video key={rec.id} src={rec.url} controls autoPlay className="w-full rounded-lg border border-border max-h-48 object-contain bg-black" onEnded={() => setPlayingId(null)} />
                    )}
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
