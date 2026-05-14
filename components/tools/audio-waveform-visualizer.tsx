"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Download, FileAudio, Play, Pause, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ── Waveform renderer ─────────────────────────────────────────────────────────
function drawWaveform(canvas: HTMLCanvasElement, data: Float32Array, playPct = 0, options: {
  color?: string
  backgroundColor?: string
  style?: "bars" | "line"
  barWidth?: number
} = {}) {
  const ctx = canvas.getContext("2d")!
  const dpr = window.devicePixelRatio || 1
  // Use CSS layout size to avoid exponential buffer growth on repeated calls
  const W = canvas.clientWidth || 800
  const H = canvas.clientHeight || 200
  canvas.width  = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)

  const { color = "#6366f1", backgroundColor = "#f8fafc", style = "bars", barWidth = 1 } = options
  const mid = H / 2

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, W, H)

  if (style === "bars") {
    const step = Math.ceil(data.length / W)
    for (let x = 0; x < W; x += barWidth + 1) {
      let max = 0
      const s = Math.floor(x * step)
      const e = Math.min(s + step, data.length)
      for (let j = s; j < e; j++) { const v = Math.abs(data[j] || 0); if (v > max) max = v }
      const h = Math.max(1, max * mid * 0.95)
      ctx.fillStyle = color
      ctx.fillRect(x, mid - h, barWidth, h * 2)
    }
  } else {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const y = mid + (data[Math.floor(x * data.length / W)] * mid * 0.95)
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  if (playPct > 0) {
    const played = Math.round(W * playPct)
    // Played overlay
    ctx.fillStyle = "rgba(255,255,255,0.12)"
    ctx.fillRect(0, 0, played, H)
    // Playhead
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(played, 0)
    ctx.lineTo(played, H)
    ctx.stroke()
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AudioWaveformVisualizer() {
  const [activeTab, setActiveTab]   = useState<"input" | "output">("input")
  const [filename, setFilename]     = useState("")
  const [waveData, setWaveData]     = useState<Float32Array | null>(null)
  const [duration, setDuration]     = useState(0)
  const [loading, setLoading]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [waveColor, setWaveColor]   = useState("#6366f1")
  const [bgColor, setBgColor]       = useState("#f8fafc")
  const [waveStyle, setWaveStyle]   = useState<"bars" | "line">("bars")
  const [barWidth, setBarWidth]     = useState(1)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const audioRef     = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef   = useRef<string | null>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const isDragging   = useRef(false)

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // ── File loading ────────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Tear down previous audio
    audioRef.current?.pause()
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    audioRef.current = null
    blobUrlRef.current = null
    setIsPlaying(false)
    setCurrentTime(0)
    setWaveData(null)
    setLoading(true)
    setFilename(file.name)

    try {
      const ab  = await file.arrayBuffer()
      const ac  = new AudioContext()
      const buf = await ac.decodeAudioData(ab)
      setDuration(buf.duration)
      await ac.close()

      // Downsample to mono for drawing
      const raw = buf.getChannelData(0)
      const N   = 4000
      const step = Math.floor(raw.length / N)
      const down = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        let max = 0
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(raw[i * step + j] || 0))
        down[i] = max
      }
      setWaveData(down)

      // Create audio element for playback
      const url = URL.createObjectURL(file)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime))
      audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0) })
      audioRef.current = audio

      setActiveTab("output")
    } catch (err) { console.error(err) }

    setLoading(false)
    e.target.value = ""
  }

  // ── Playback ────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else            { audio.play();  setIsPlaying(true)  }
  }, [isPlaying])

  const seekTo = useCallback((clientX: number) => {
    const audio = audioRef.current
    if (!audio || !duration || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audio.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }, [duration])

  // Mouse drag
  const handleMouseDown  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => { isDragging.current = true;  seekTo(e.clientX) }, [seekTo])
  const handleMouseMove  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => { if (isDragging.current) seekTo(e.clientX) }, [seekTo])
  const handleMouseUp    = useCallback(() => { isDragging.current = false }, [])
  const handleMouseLeave = useCallback(() => { isDragging.current = false }, [])

  // Touch drag (e.preventDefault stops the page from scrolling while scrubbing)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); isDragging.current = true; seekTo(e.touches[0].clientX)
  }, [seekTo])
  const handleTouchMove  = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); if (isDragging.current) seekTo(e.touches[0].clientX)
  }, [seekTo])
  const handleTouchEnd   = useCallback(() => { isDragging.current = false }, [])

  // ── Exports ─────────────────────────────────────────────────────────────────
  const downloadPng = () => {
    if (!waveData) return
    const c = document.createElement("canvas")
    c.width = 2000; c.height = 400
    drawWaveform(c, waveData, 0, { color: waveColor, backgroundColor: bgColor, style: waveStyle, barWidth: Math.max(1, barWidth * 2) })
    const a = document.createElement("a")
    a.download = `waveform-${filename.replace(/\.[^/.]+$/, "")}.png`
    a.href = c.toDataURL("image/png")
    a.click()
  }

  const downloadSvg = () => {
    if (!waveData) return
    const W = 2000, H = 400, mid = H / 2
    let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`
    svg += `<rect width="${W}" height="${H}" fill="${bgColor}"/>`
    if (waveStyle === "bars") {
      const step = Math.ceil(waveData.length / W)
      for (let x = 0; x < W; x += barWidth + 1) {
        let max = 0
        for (let j = 0; j < step; j++) { const v = Math.abs(waveData[x * step + j] || 0); if (v > max) max = v }
        const h = Math.max(1, max * mid * 0.95)
        svg += `<rect x="${x}" y="${mid - h}" width="${barWidth}" height="${h * 2}" fill="${waveColor}"/>`
      }
    } else {
      svg += `<polyline points="`
      for (let x = 0; x < W; x++) svg += `${x},${mid + waveData[Math.floor(x * waveData.length / W)] * mid * 0.95} `
      svg += `" fill="none" stroke="${waveColor}" stroke-width="2"/>`
    }
    svg += "</svg>"
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.download = `waveform-${filename.replace(/\.[^/.]+$/, "")}.svg`
    a.href = url; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Redraw canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!waveData || !canvasRef.current) return
    drawWaveform(canvasRef.current, waveData, duration > 0 ? currentTime / duration : 0, {
      color: waveColor, backgroundColor: bgColor, style: waveStyle, barWidth
    })
  }, [waveData, waveColor, bgColor, waveStyle, barWidth, currentTime, duration])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "U") { e.preventDefault(); inputRef.current?.click(); return }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E" && waveData) { e.preventDefault(); downloadPng(); return }
      if ((e.ctrlKey || e.metaKey) && e.altKey    && e.key === "E" && waveData) { e.preventDefault(); downloadSvg(); return }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") { e.preventDefault(); setShowSettings(v => !v); return }
      if (e.key === " " && !e.ctrlKey && !e.metaKey && audioRef.current) { e.preventDefault(); togglePlay(); return }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [waveData, togglePlay])

  // ── Shortcuts list ──────────────────────────────────────────────────────────
  const shortcuts = [
    { keys: ["Ctrl", "Shift", "U"],   description: "Upload audio file" },
    { keys: ["Ctrl", "Shift", "E"],   description: "Export waveform as PNG" },
    { keys: ["Ctrl", "Alt",   "E"],   description: "Export waveform as SVG" },
    { keys: ["Ctrl", "Shift", "S"],   description: "Toggle settings panel" },
    { keys: ["Space"],                description: "Play / Pause" },
    { keys: ["?"],                    description: "Toggle this shortcuts panel" },
  ]

  return (
    <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Audio Waveform Visualizer">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {waveData ? `Waveform loaded for ${filename}. Duration: ${fmtTime(duration)}.` : ""}
      </div>

      {/* Desktop top bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Audio Waveform Visualizer</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Audio Waveform Visualizer" shortcuts={shortcuts} />
          <Button size="sm" onClick={downloadPng} disabled={!waveData} aria-label="Export waveform as PNG">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Export PNG
            <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Audio Waveform Visualizer</h2>
          <ShortcutsModal pageName="Audio Waveform Visualizer" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Waveform
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Left panel — upload + settings */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Upload and settings">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Audio File &amp; Settings</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Upload */}
              <div className="space-y-2" role="group" aria-labelledby="upload-heading">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="upload-heading">Audio File</Label>
                  <kbd className="hidden md:inline text-xs text-muted-foreground rounded border border-border bg-muted px-1.5 py-0.5" aria-hidden="true">Ctrl+Shift+U</kbd>
                </div>
                <div
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
                  role="button" tabIndex={0}
                  className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Upload audio file. Click or press Enter to browse."
                >
                  <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} aria-hidden="true" />
                  {waveData ? (
                    <div className="flex items-center gap-3 px-4 w-full">
                      <FileAudio className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{filename}</p>
                        <p className="text-xs text-muted-foreground">{fmtTime(duration)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center px-4">
                      <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm font-medium">{loading ? "Analysing audio…" : "Drop a file or click to browse"}</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, OGG, FLAC, M4A</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4" role="group" aria-labelledby="settings-heading">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="settings-heading">Waveform Settings</Label>
                  <button
                    onClick={() => setShowSettings(v => !v)}
                    className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    aria-expanded={showSettings}
                  >
                    {showSettings ? "Hide" : "Show"}
                    <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
                  </button>
                </div>

                {showSettings && (
                  <div className="space-y-4">
                    {/* Style */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Style</Label>
                      <div className="flex gap-2" role="radiogroup" aria-label="Waveform style">
                        {(["bars", "line"] as const).map(s => (
                          <button key={s} onClick={() => setWaveStyle(s)}
                            className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-all focus:outline-none focus:ring-2 focus:ring-primary ${waveStyle === s ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                            role="radio" aria-checked={waveStyle === s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bar width */}
                    {waveStyle === "bars" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Bar Width</Label>
                        <div className="flex gap-2" role="radiogroup" aria-label="Bar width">
                          {[1, 2, 3].map(w => (
                            <button key={w} onClick={() => setBarWidth(w)}
                              className={`flex-1 rounded-lg border py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary ${barWidth === w ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                              role="radio" aria-checked={barWidth === w} aria-label={`${w}px bar width`}>
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest" htmlFor="wave-color">Waveform</Label>
                        <div className="flex items-center gap-2">
                          <input id="wave-color" type="color" value={waveColor} onChange={e => setWaveColor(e.target.value)}
                            className="w-10 h-8 rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Waveform color" />
                          <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{waveColor}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest" htmlFor="bg-color">Background</Label>
                        <div className="flex items-center gap-2">
                          <input id="bg-color" type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                            className="w-10 h-8 rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Background color" />
                          <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{bgColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel — waveform + player */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 bg-card`} role="region" aria-label="Waveform and playback">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Waveform</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {waveData ? (
                <div className="flex flex-col gap-4 h-full">
                  {/* Canvas */}
                  <div className="relative rounded-xl overflow-hidden border border-border" style={{ minHeight: 160 }}>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-40 cursor-pointer select-none"
                      style={{ touchAction: "none" }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      role="img"
                      tabIndex={0}
                      aria-label={`Waveform for ${filename}. Duration: ${fmtTime(duration)}. Tap or drag to seek.`}
                    />
                  </div>

                  {/* Playback controls */}
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="h-9 w-9 p-0 shrink-0">
                      {isPlaying
                        ? <Pause className="h-4 w-4" aria-hidden="true" />
                        : <Play  className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                    <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{fmtTime(currentTime)}</span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                      </div>
                      <span>{fmtTime(duration)}</span>
                    </div>
                    <kbd className="hidden md:inline text-xs text-muted-foreground rounded border border-border bg-muted px-1.5 py-0.5" aria-hidden="true">Space</kbd>
                  </div>

                  {/* Export buttons */}
                  <div className="flex gap-2" role="group" aria-label="Export options">
                    <Button variant="outline" size="sm" onClick={downloadPng} className="flex-1" aria-label="Export as PNG">
                      <Image className="h-4 w-4 mr-1.5" aria-hidden="true" />PNG
                      <kbd className="ml-1.5 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadSvg} className="flex-1" aria-label="Export as SVG">
                      <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />SVG
                      <kbd className="ml-1.5 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Alt+E</kbd>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <div className="rounded-full border border-border bg-muted/50 p-4">
                    <Upload className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No audio loaded</p>
                    <p className="text-xs mt-0.5">Upload an audio file to visualize its waveform</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">How to use Audio Waveform Visualizer</h3>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Getting started</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Upload an audio file by clicking the upload area or dragging a file onto it.</li>
              <li>The waveform appears on the right. Click or drag anywhere on the waveform to seek to that position. On touchscreens, slide your finger across the waveform to scrub.</li>
              <li>Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Space</kbd> or click the play button to start or pause playback. The red line shows your current position.</li>
              <li>Adjust the <span className="text-foreground font-medium">Waveform Settings</span> to change the style, bar width, and colors, then export as PNG or SVG.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Export formats</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <p><span className="text-foreground font-medium">PNG</span> — Raster image at 2000x400 pixels. Best for sharing, embedding in documents, or social media.</p>
              <p><span className="text-foreground font-medium">SVG</span> — Vector image that scales to any size without losing quality. Best for design tools or print.</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Bars style works well for music. Line style suits voice recordings and podcasts.</li>
              <li>Use a transparent or white background for PNGs you plan to place on coloured slides.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* Mobile bottom bar — fixed */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button variant="outline" size="sm" className="h-11 w-11 p-0 shrink-0" onClick={togglePlay}
          disabled={!waveData} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={downloadPng} disabled={!waveData} aria-label="Export PNG">
          <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />Export PNG
        </Button>
      </div>
    </div>
  )
}
