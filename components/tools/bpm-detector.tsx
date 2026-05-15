"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Music2, Upload, X, AlertCircle } from "lucide-react"
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

function announceToScreenReader(message: string) {
  const el = document.createElement("div")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.setAttribute("aria-atomic", "true")
  el.className = "sr-only"
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => document.body.removeChild(el), 1000)
}

// ── Component ─────────────────────────────────────────────────────────────────
type Phase = "idle" | "decoding" | "analyzing" | "done"

export default function BPMDetector() {
  const [file, setFile]         = useState<File | null>(null)
  const [phase, setPhase]       = useState<Phase>("idle")
  const [result, setResult]     = useState<{ bpm: number; confidence: number } | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const handleFile = (f: File) => {
    if (!f.type.startsWith("audio/")) return
    setFile(f); setResult(null); setError(null); setPhase("idle"); setDuration(null)
  }

  const analyze = useCallback(async () => {
    if (!file) return
    setPhase("decoding"); setError(null); setResult(null)
    announceToScreenReader("Analyzing BPM, please wait.")
    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      setDuration(audioBuffer.duration)
      await audioCtx.close()
      setPhase("analyzing")
      await new Promise(r => setTimeout(r, 50))
      const bpmResult = detectBPM(audioBuffer)
      setResult(bpmResult)
      setPhase("done")
      announceToScreenReader(`BPM detected: ${bpmResult.bpm}`)
    } catch {
      setError("Could not decode audio. Try MP3 or WAV format.")
      setPhase("idle")
    }
  }, [file])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        analyze()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        inputRef.current?.click()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [analyze])

  const isProcessing = phase === "decoding" || phase === "analyzing"

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">BPM Detector</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="BPM Detector" shortcuts={[
            { keys: ["Ctrl", "Enter"], description: "Detect BPM" },
            { keys: ["Ctrl", "Shift", "U"], description: "Open audio file" },
          ]} />
          <Button size="sm" onClick={analyze} disabled={!file || isProcessing} aria-label="Detect BPM">
            {isProcessing ? (
              <><span className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Processing…</>
            ) : (
              <><Music2 className="h-4 w-4 mr-1" aria-hidden="true" />Detect BPM<kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Enter</kbd></>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">BPM Detector</h2>
          <ShortcutsModal pageName="BPM Detector" shortcuts={[{ keys: ["Ctrl", "Enter"], description: "Detect BPM" }]} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Result
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Two-panel card */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[500px]">

            {/* Left panel — Upload */}
            <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Upload audio file">
              <div className="flex-1 overflow-y-auto p-4 space-y-6">

                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">Works best for electronic music with clear beats</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">May be less accurate for acoustic, jazz, or complex rhythms</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Audio File</Label>
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click() } }}
                    aria-label={file ? `Selected: ${file.name}. Press Enter to change file.` : "Drop audio file here or press Enter to browse"}
                    className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <input ref={inputRef} type="file" accept="audio/*" aria-label="Upload audio file" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                    {file ? (
                      <div className="flex items-center gap-3 px-4 w-full">
                        <div className="rounded-md bg-primary/10 p-2 shrink-0">
                          <Music2 className="h-5 w-5 text-primary" aria-hidden="true" />
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
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></div>
                        <p className="text-sm font-medium">Drop an audio file here</p>
                        <p className="text-xs text-muted-foreground">
                          MP3, WAV, OGG, M4A · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd>
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

                {error && (
                  <div role="alert" aria-live="assertive">
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                      {error}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Right panel — Result */}
            <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 bg-card`} role="region" aria-label="BPM result">
              <div className="flex-1 overflow-y-auto p-4">
                {!result ? (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full border border-border bg-muted/50 p-4">
                      <Music2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No result yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Drop an audio file and click Detect BPM</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-6 py-8">
                    <div className="text-center">
                      <p className="text-[80px] font-bold leading-none tabular-nums" aria-label={`${result.bpm} BPM`}>{result.bpm}</p>
                      <p className="text-lg text-muted-foreground mt-1" aria-hidden="true">BPM</p>
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
                      <div
                        className="h-2 w-full rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(result.confidence * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Detection confidence"
                      >
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
                      aria-label="Analyze the same file again"
                      className="hidden md:inline text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      Analyze again
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Drop an audio file onto the upload area, or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> to browse.</li>
              <li>Click <span className="text-foreground font-medium">Detect BPM</span> or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd> to analyze.</li>
              <li>Read the detected BPM, tempo label, and confidence score in the Result panel.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd> Detect BPM</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> Open file browser</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Open shortcuts reference</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Only the first 60 seconds of audio are analyzed for speed.</li>
              <li>Low confidence usually means the beat is too soft or the rhythm is irregular. Try a louder or more rhythmic section.</li>
              <li>If the result looks wrong, the true BPM may be half or double the shown value. This is common with electronic and drum-heavy tracks.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />

      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={() => { analyze(); setActiveTab("output") }} disabled={!file || isProcessing} aria-label="Detect BPM">
          {isProcessing ? "Processing…" : <><Music2 className="h-4 w-4 mr-1.5" aria-hidden="true" />Detect BPM</>}
        </Button>
      </div>

    </div>
  )
}
