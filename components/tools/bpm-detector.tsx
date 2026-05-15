"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Music2, Upload, X, AlertCircle, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ── BPM Detection ─────────────────────────────────────────────────────────────
function detectBPM(buffer: AudioBuffer): { bpm: number; confidence: number } {
  const sampleRate = buffer.sampleRate
  const maxSamples = Math.min(buffer.length, sampleRate * 60)
  const rawData = buffer.getChannelData(0).slice(0, maxSamples)

  const filtered = new Float32Array(rawData.length)
  const alpha = Math.exp(-2 * Math.PI * (200 / sampleRate))
  let prev = 0
  for (let i = 0; i < rawData.length; i++) {
    filtered[i] = prev = (1 - alpha) * rawData[i] + alpha * prev
  }

  const HOP = 512
  const numFrames = Math.floor(filtered.length / HOP)
  const energy = new Float32Array(numFrames)
  for (let i = 0; i < numFrames; i++) {
    let sum = 0
    for (let j = 0; j < HOP; j++) sum += filtered[i * HOP + j] ** 2
    energy[i] = Math.sqrt(sum / HOP)
  }

  const maxE = energy.reduce((a, b) => Math.max(a, b), 0)
  if (maxE === 0) return { bpm: 120, confidence: 0 }
  const normE = Array.from(energy).map(e => e / maxE)

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
  const [file, setFile]             = useState<File | null>(null)
  const [phase, setPhase]           = useState<Phase>("idle")
  const [result, setResult]         = useState<{ bpm: number; confidence: number } | null>(null)
  const [displayBpm, setDisplayBpm] = useState<number | null>(null)
  const [duration, setDuration]     = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab]   = useState<"input" | "output">("input")
  const [fileCopied, setFileCopied] = useState(false)
  const [tapBpm, setTapBpm]         = useState<number | null>(null)
  const [tapCount, setTapCount]     = useState(0)
  const [tapCopied, setTapCopied]   = useState(false)
  const tapTimestamps               = useRef<number[]>([])
  const tapResetTimer               = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith("audio/")) return
    setFile(f); setResult(null); setDisplayBpm(null); setError(null); setPhase("idle"); setDuration(null)
  }

  const analyze = useCallback(async () => {
    if (!file) return
    setPhase("decoding"); setError(null); setResult(null); setDisplayBpm(null)
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
      setDisplayBpm(bpmResult.bpm)
      setPhase("done")
      announceToScreenReader(`BPM detected: ${bpmResult.bpm}`)
    } catch {
      setError("Could not decode audio. Try MP3 or WAV format.")
      setPhase("idle")
    }
  }, [file])

  const handleHalf = useCallback(() => {
    setDisplayBpm(prev => {
      if (!prev) return prev
      const n = Math.round(prev / 2)
      announceToScreenReader(`BPM halved to ${n}`)
      return n
    })
  }, [])

  const handleDouble = useCallback(() => {
    setDisplayBpm(prev => {
      if (!prev) return prev
      const n = prev * 2
      announceToScreenReader(`BPM doubled to ${n}`)
      return n
    })
  }, [])

  const copyFileBpm = useCallback(() => {
    if (!displayBpm) return
    navigator.clipboard.writeText(String(displayBpm))
    setFileCopied(true)
    announceToScreenReader(`${displayBpm} BPM copied to clipboard`)
    setTimeout(() => setFileCopied(false), 2000)
  }, [displayBpm])

  const handleTap = useCallback(() => {
    const now = performance.now()
    const prev = tapTimestamps.current

    if (prev.length > 0 && now - prev[prev.length - 1] > 2000) {
      tapTimestamps.current = [now]
      setTapCount(1)
      setTapBpm(null)
    } else {
      tapTimestamps.current = [...prev.slice(-7), now]
      const ts = tapTimestamps.current
      setTapCount(ts.length)
      if (ts.length >= 2) {
        const intervals = ts.slice(1).map((t, i) => t - ts[i])
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const bpm = Math.round(60000 / avg)
        setTapBpm(bpm)
        announceToScreenReader(`Tap tempo: ${bpm} BPM`)
      }
    }

    if (tapResetTimer.current) clearTimeout(tapResetTimer.current)
    tapResetTimer.current = setTimeout(() => {
      tapTimestamps.current = []
      setTapBpm(null)
      setTapCount(0)
    }, 2500)
  }, [])

  const copyTapBpm = useCallback(() => {
    if (!tapBpm) return
    navigator.clipboard.writeText(String(tapBpm))
    setTapCopied(true)
    announceToScreenReader(`${tapBpm} BPM copied to clipboard`)
    setTimeout(() => setTapCopied(false), 2000)
  }, [tapBpm])

  useEffect(() => {
    return () => { if (tapResetTimer.current) clearTimeout(tapResetTimer.current) }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault(); analyze()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault(); inputRef.current?.click()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault(); copyFileBpm()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [analyze, copyFileBpm])

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
            { keys: ["Ctrl", "Shift", "V"], description: "Copy detected BPM" },
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

            {/* Left panel — Upload + Tap Tempo */}
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
                          onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setDisplayBpm(null); setPhase("idle") }}
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

                {/* Tap Tempo */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground shrink-0">or tap in the beat</span>
                    <div className="flex-1 h-px bg-border" aria-hidden="true" />
                  </div>
                  <button
                    onClick={handleTap}
                    aria-label={tapBpm ? `Tap to continue. ${tapCount} taps, ${tapBpm} BPM` : "Tap to start measuring BPM manually"}
                    className="w-full h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10 active:border-primary transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {tapBpm ? (
                      <span className="text-2xl font-bold tabular-nums">
                        {tapBpm} <span className="text-sm font-normal text-muted-foreground">BPM</span>
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">Tap here</span>
                    )}
                  </button>
                  {tapCount > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tapCount} tap{tapCount !== 1 ? "s" : ""} · resets after 2s pause</span>
                      {tapBpm && (
                        <button
                          onClick={copyTapBpm}
                          aria-label={`Copy tap tempo ${tapBpm} BPM to clipboard`}
                          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        >
                          {tapCopied ? "Copied!" : "Copy BPM"}
                        </button>
                      )}
                    </div>
                  )}
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
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-5 py-8">

                    {/* BPM number + copy button */}
                    <div className="text-center">
                      <p className="text-[80px] font-bold leading-none tabular-nums" aria-label={`${displayBpm} BPM`}>{displayBpm}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <p className="text-lg text-muted-foreground" aria-hidden="true">BPM</p>
                        <button
                          onClick={copyFileBpm}
                          aria-label={`Copy ${displayBpm} BPM to clipboard`}
                          className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                        >
                          {fileCopied
                            ? <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
                            : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      </div>
                    </div>

                    {/* ½× / 2× correction buttons */}
                    <div className="flex gap-2 w-full max-w-xs" role="group" aria-label="BPM correction">
                      <button
                        onClick={handleHalf}
                        disabled={!displayBpm || displayBpm / 2 < 30}
                        aria-label={displayBpm ? `Halve BPM to ${Math.round(displayBpm / 2)}` : "Halve BPM"}
                        className="flex-1 rounded-lg border border-border bg-muted/30 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        ½× {displayBpm ? Math.round(displayBpm / 2) : "—"}
                      </button>
                      <button
                        onClick={handleDouble}
                        disabled={!displayBpm || displayBpm * 2 > 300}
                        aria-label={displayBpm ? `Double BPM to ${displayBpm * 2}` : "Double BPM"}
                        className="flex-1 rounded-lg border border-border bg-muted/30 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        2× {displayBpm ? displayBpm * 2 : "—"}
                      </button>
                    </div>

                    {/* Tempo label — updates with displayBpm */}
                    {displayBpm && (
                      <div className="text-center">
                        <p className={`text-2xl font-semibold ${tempoLabel(displayBpm).color}`}>
                          {tempoLabel(displayBpm).label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{tempoLabel(displayBpm).genre}</p>
                      </div>
                    )}

                    {/* Confidence bar — always from the original detection */}
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
              <li>If the result looks off, use <span className="text-foreground font-medium">½×</span> or <span className="text-foreground font-medium">2×</span> to correct by half or double.</li>
              <li>For acoustic or live music, tap the <span className="text-foreground font-medium">Tap here</span> button in time with the beat to measure manually.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd> Detect BPM</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> Open file browser</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> Copy detected BPM</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Open shortcuts reference</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Only the first 60 seconds of audio are analyzed for speed.</li>
              <li>Low confidence usually means the beat is too soft or the rhythm is irregular.</li>
              <li>The algorithm commonly reports half or double the true BPM for complex or layered tracks. Use <span className="text-foreground font-medium">½×</span> or <span className="text-foreground font-medium">2×</span> to fix this in one click.</li>
              <li>Tap tempo works best with at least 4 taps. It averages the last 8 intervals for accuracy.</li>
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
