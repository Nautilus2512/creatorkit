"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Play, Pause, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

function drawWaveform(canvas: HTMLCanvasElement, data: Float32Array, playPct = 0) {
  const ctx = canvas.getContext("2d")!
  const { width: W, height: H } = canvas
  ctx.clearRect(0, 0, W, H)

  const mid = H / 2
  const step = Math.ceil(data.length / W)
  const played = Math.round(W * playPct)

  for (let x = 0; x < W; x++) {
    let max = 0
    for (let j = 0; j < step; j++) {
      const v = Math.abs(data[x * step + j] || 0)
      if (v > max) max = v
    }
    const h = Math.max(1, max * mid * 0.95)
    ctx.fillStyle = x < played ? "#6366f1" : "#d1d5db"
    ctx.fillRect(x, mid - h, 1, h * 2)
  }

  // Playhead
  if (playPct > 0) {
    ctx.strokeStyle = "#6366f1"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(played, 0)
    ctx.lineTo(played, H)
    ctx.stroke()
  }
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export default function AudioWaveformVisualizer() {
  const [audioUrl, setAudioUrl] = useState("")
  const [filename, setFilename] = useState("")
  const [waveData, setWaveData] = useState<Float32Array | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef(0)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setWaveData(null)
    setPlaying(false)
    audioRef.current?.pause()
    setCurrentTime(0)

    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    setFilename(file.name)

    try {
      const buf = await file.arrayBuffer()
      const ac = new AudioContext()
      const decoded = await ac.decodeAudioData(buf)
      setDuration(decoded.duration)
      // Downsample to mono
      const raw = decoded.getChannelData(0)
      const targetLen = 4000
      const step = Math.floor(raw.length / targetLen)
      const down = new Float32Array(targetLen)
      for (let i = 0; i < targetLen; i++) {
        let max = 0
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(raw[i * step + j] || 0))
        down[i] = max
      }
      setWaveData(down)
      ac.close()
    } catch (err) { console.error(err) }
    setLoading(false)
    e.target.value = ""
  }

  useEffect(() => {
    if (!waveData || !canvasRef.current) return
    const canvas = canvasRef.current
    const pct = duration > 0 ? currentTime / duration : 0
    drawWaveform(canvas, waveData, pct)
  }, [waveData, currentTime, duration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveData || !duration) return

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const pct = (e.clientX - rect.left) / rect.width
      const t = pct * duration
      setCurrentTime(t)
      if (audioRef.current) audioRef.current.currentTime = t
    }
    canvas.addEventListener("click", onClick)
    return () => canvas.removeEventListener("click", onClick)
  }, [waveData, duration])

  const togglePlay = () => {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current!.currentTime)
      }
      audioRef.current.onended = () => {
        setPlaying(false)
        cancelAnimationFrame(rafRef.current)
      }
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Audio Waveform Visualizer</h1>
            <p className="text-sm text-muted-foreground">Visualize audio waveforms and play back any audio file in your browser.</p>
          </div>
          {audioUrl && (
            <a href={audioUrl} download={filename}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />Download
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!waveData ? (
          <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-6 rounded-xl hover:border-primary/50 transition-colors">
            <input type="file" accept="audio/*" className="hidden" onChange={handleFile} />
            <Upload className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{loading ? "Analyzing audio…" : "Click to upload an audio file"}</p>
            <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, FLAC, M4A</p>
          </label>
        ) : (
          <div className="flex-1 flex flex-col p-6 gap-6">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium truncate flex-1">{filename}</p>
              <label className="cursor-pointer">
                <input type="file" accept="audio/*" className="hidden" onChange={handleFile} />
                <Button variant="ghost" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Change</span>
                </Button>
              </label>
            </div>

            {/* Waveform */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <canvas
                ref={canvasRef}
                className="w-full flex-1 rounded-xl border border-border bg-muted/10 cursor-pointer min-h-0"
                style={{ minHeight: 120 }}
              />
            </div>

            {/* Controls */}
            <div className="shrink-0 flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={togglePlay} className="w-10 h-10 p-0">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const pct = e.nativeEvent.offsetX / e.currentTarget.offsetWidth
                  const t = pct * duration
                  setCurrentTime(t)
                  if (audioRef.current) audioRef.current.currentTime = t
                }}>
                <div className="h-full bg-primary rounded-full transition-none" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">Click anywhere on the waveform to seek</p>
          </div>
        )}
      </div>
    </div>
  )
}
