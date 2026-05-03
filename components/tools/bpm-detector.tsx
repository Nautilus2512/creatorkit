"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Music2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ── BPM Detection ─────────────────────────────────────────────────────────────
function detectBPM(buffer: AudioBuffer): { bpm: number; confidence: number } {
  const sampleRate = buffer.sampleRate
  const maxSamples = Math.min(buffer.length, sampleRate * 60)
  const rawData = buffer.getChannelData(0).slice(0, maxSamples)

  // Low-pass filter to isolate bass (where beats live)
  const filtered = new Float32Array(rawData.length)
  const alpha = Math.exp(-2 * Math.PI * (200 / sampleRate))
  let prev = 0
  for (let i = 0; i < rawData.length; i++) {
    filtered[i] = prev = (1 - alpha) * rawData[i] + alpha * prev
  }

  // Energy envelope in 512-sample hops
  const HOP = 512
  const numFrames = Math.floor(filtered.length / HOP)
  const energy = new Float32Array(numFrames)
  for (let i = 0; i < numFrames; i++) {
    let sum = 0
    for (let j = 0; j < HOP; j++) sum += filtered[i * HOP + j] ** 2
    energy[i] = Math.sqrt(sum / HOP)
  }

  // Normalize energy
  const maxE = energy.reduce((a, b) => Math.max(a, b), 0)
  if (maxE === 0) return { bpm: 120, confidence: 0 }
  const normE = Array.from(energy).map(e => e / maxE)

  // Autocorrelation over BPM range 60–200
  const fps = sampleRate / HOP
  const minLag = Math.max(1, Math.round(fps * 60 / 200))
  const maxLag = Math.round(fps * 60 / 60)

  let bestLag = minLag, bestCorr = -1
  const corrValues: number[] = []

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    const n = normE.length - lag
    for (let i = 0; i < n; i++) corr += normE[i] * normE[i + lag]
    corr /= n
    corrValues.push(corr)
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }

  let bpm = Math.round(fps * 60 / bestLag)
  while (bpm < 60) bpm *= 2
  while (bpm > 180) bpm /= 2

  const avgCorr = corrValues.reduce((a, b) => a + b, 0) / corrValues.length
  const confidence = Math.max(0, Math.min(1, (bestCorr - avgCorr) / (bestCorr + 0.01)))

  return { bpm, confidence }
}

function tempoLabel(bpm: number): { label: string; color: string; genre: string } {
  if (bpm < 70)  return { label: "Slow",      color: "text-blue-400",   genre: "Ballad / Ambient" }
  if (bpm < 100) return { label: "Moderate",  color: "text-green-400",  genre: "Hip-hop / R&B" }
  if (bpm < 130) return { label: "Upbeat",    color: "text-yellow-400", genre: "Pop / Rock / Funk" }
  if (bpm < 160) return { label: "Fast",      color: "text-orange-400", genre: "Electronic / Dance" }
  return               { label: "Very Fast",  color: "text-red-400",    genre: "Drum & Bass / Hardcore" }
}

function formatBytes(n: number) {
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`
}

// ── Component ─────────────────────────────────────────────────────────────────
type Phase = "idle" | "decoding" | "analyzing" | "done"

export function BPMDetector() {
  const [file, setFile]       = useState<File | null>(null)
  const [phase, setPhase]     = useState<Phase>("idle")
  const [result, setResult]   = useState<{ bpm: number; confidence: number } | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith("audio/")) return
    setFile(f); setResult(null); setError(null); setPhase("idle"); setDuration(null)
  }

  const analyze = useCallback(async () => {
    if (!file) return
    setPhase("decoding"); setError(null); setResult(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      setDuration(audioBuffer.duration)
      await audioCtx.close()
      setPhase("analyzing")
      await new Promise(r => setTimeout(r, 50))
      setResult(detectBPM(audioBuffer))
      setPhase("done")
    } catch {
      setError("Could not decode audio. Try MP3 or WAV format.")
      setPhase("idle")
    }
  }, [file])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); analyze() }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") { e.preventDefault(); inputRef.current?.click() }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [analyze])

  const isProcessing = phase === "decoding" || phase === "analyzing"

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Music2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">BPM Detector</h1>
              <p className="text-xs text-muted-foreground">Detect audio tempo · 100% in-browser</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Audio File</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => inputRef.current?.click()}
              className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input ref={inputRef} type="file" accept="audio/*" aria-label="Upload audio file" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {file ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0">
                    <Music2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}{duration ? ` · ${formatDuration(duration)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setPhase("idle") }}
                    aria-label="Remove audio file"
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm font-medium">Drop an audio file here</p>
                  <p className="text-xs text-muted-foreground">
                    MP3, WAV, OGG, M4A · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+O</kbd>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Accuracy notes</p>
            <p>Best on: electronic, dance, pop, hip-hop with steady beats.</p>
            <p>Less accurate on: classical, jazz, live recordings with irregular tempo.</p>
            <p>Only the first 60 seconds are analyzed.</p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button className="w-full" onClick={analyze} disabled={!file || isProcessing}>
            {isProcessing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                {phase === "decoding" ? "Decoding audio…" : "Analyzing beats…"}
              </>
            ) : (
              <>
                <Music2 className="mr-2 h-4 w-4" />
                Detect BPM
                <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]">Ctrl+Enter</kbd>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {!result ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Music2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No result yet</p>
                <p className="text-xs text-muted-foreground mt-1">Drop an audio file and click Detect BPM</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-6 py-8">
              <div className="text-center">
                <p className="text-[80px] font-bold leading-none tabular-nums">{result.bpm}</p>
                <p className="text-lg text-muted-foreground mt-1">BPM</p>
              </div>

              <div className="text-center">
                <p className={`text-2xl font-semibold ${tempoLabel(result.bpm).color}`}>
                  {tempoLabel(result.bpm).label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{tempoLabel(result.bpm).genre}</p>
              </div>

              <div className="w-full max-w-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Detection confidence</span>
                  <span>{result.confidence < 0.33 ? "Low" : result.confidence < 0.66 ? "Medium" : "High"}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      result.confidence < 0.33 ? "bg-red-500" :
                      result.confidence < 0.66 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
                {result.confidence < 0.33 && (
                  <p className="text-xs text-muted-foreground">Beat may be irregular or audio too quiet.</p>
                )}
              </div>

              <button
              onClick={() => analyze()}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Analyze again
              </button>
            </div>
          )}
        </div>
      </div>

      <ShortcutsModal
        pageName="BPM Detector"
        shortcuts={[
          { keys: ["Ctrl", "Enter"], description: "Detect BPM" },
          { keys: ["Ctrl", "O"], description: "Open audio file" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
