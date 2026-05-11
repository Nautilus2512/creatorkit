"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Download, Settings, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function drawWaveform(canvas: HTMLCanvasElement, data: Float32Array, playPct = 0, options: {
  color?: string
  backgroundColor?: string
  lineWidth?: number
  style?: 'bars' | 'line'
  barWidth?: number
} = {}) {
  const ctx = canvas.getContext("2d")!
  const { width: W, height: H } = canvas
  
  // Handle high DPI displays
  const dpr = window.devicePixelRatio || 1
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)
  
  ctx.clearRect(0, 0, W, H)
  
  const {
    color = "#6366f1",
    backgroundColor = "#f8fafc",
    lineWidth = 2,
    style = 'bars',
    barWidth = 1
  } = options
  
  // Background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, W, H)

  const mid = H / 2
  const played = Math.round(W * playPct)

  if (style === 'bars') {
    const step = Math.ceil(data.length / W)
    for (let x = 0; x < W; x += barWidth + 1) {
      let max = 0
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[x * step + j] || 0)
        if (v > max) max = v
      }
      const h = Math.max(1, max * mid * 0.95)
      ctx.fillStyle = x < played ? color : "#d1d5db"
      ctx.fillRect(x, mid - h, barWidth, h * 2)
    }
  } else {
    // Line style
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const index = Math.floor(x * data.length / W)
      const y = mid + (data[index] * mid * 0.95)
      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  // Playhead
  if (playPct > 0) {
    ctx.strokeStyle = color
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
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [waveColor, setWaveColor] = useState("#6366f1")
  const [backgroundColor, setBackgroundColor] = useState("#f8fafc")
  const [waveStyle, setWaveStyle] = useState<'bars' | 'line'>('bars')
  const [barWidth, setBarWidth] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      // Global shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault()
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        fileInput?.click()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "e" && waveData) {
        e.preventDefault()
        downloadWaveform()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && showSettings) {
        e.preventDefault()
        setShowSettings(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "," && !showSettings) {
        e.preventDefault()
        setShowSettings(true)
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [waveData, showSettings])

  const downloadWaveform = () => {
    if (!waveData || !canvasRef.current) return
    const canvas = canvasRef.current as HTMLCanvasElement
    
    // Create a high-resolution version for download
    const downloadCanvas = document.createElement('canvas')
    const ctx = downloadCanvas.getContext('2d')!
    downloadCanvas.width = 2000
    downloadCanvas.height = 400
    
    drawWaveform(downloadCanvas, waveData, 0, {
      color: waveColor,
      backgroundColor,
      style: waveStyle,
      barWidth: Math.max(1, barWidth * 2)
    })
    
    const link = document.createElement('a')
    link.download = `waveform-${filename.replace(/\.[^/.]+$/, '')}.png`
    link.href = downloadCanvas.toDataURL('image/png')
    link.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setWaveData(null)

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
    drawWaveform(canvas, waveData, 0, {
      color: waveColor,
      backgroundColor,
      style: waveStyle,
      barWidth
    })
  }, [waveData, waveColor, backgroundColor, waveStyle, barWidth])

    const ctx = downloadCanvas.getContext('2d')!
    downloadCanvas.width = 2000
    downloadCanvas.height = 400
    
    drawWaveform(downloadCanvas, waveData, 0, {
      color: waveColor,
      backgroundColor,
      style: waveStyle,
      barWidth: Math.max(1, barWidth * 2)
    })
    
    const link = document.createElement('a')
    link.download = `waveform-${filename.replace(/\.[^/.]+$/, '')}.png`
    link.href = downloadCanvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Audio Waveform Visualizer</h2>
          <p className="text-muted-foreground">Visualize audio waveforms and export high-quality images.</p>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
      {/* Left panel - Upload and Settings */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:overflow-hidden lg:max-h-[calc(100vh-220px)]">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Audio File & Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Upload area */}
          {!waveData ? (
            <label 
              className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Upload audio file"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                  fileInput?.click()
                }
              }}
            >
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={handleFile}
                aria-label="Audio file input"
              />
              <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" aria-hidden="true" />
              <p className="text-xs font-medium text-center">{loading ? "Analyzing audio…" : "Click or drop audio file here"}</p>
              <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, FLAC, M4A</p>
            </label>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium truncate flex-1">{filename}</p>
                <label className="cursor-pointer">
                  <input type="file" accept="audio/*" className="hidden" onChange={handleFile} />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    asChild
                    aria-label="Change audio file"
                  >
                    <span><Upload className="h-4 w-4 mr-1" aria-hidden="true" />Change <kbd className="ml-1 px-1 rounded bg-muted font-mono text-[10px]">Ctrl+O</kbd></span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Waveform Settings</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSettings(!showSettings)}
                aria-label={showSettings ? "Hide settings" : "Show settings"}
                aria-expanded={showSettings}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Style</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWaveStyle('bars')}
                    className={"px-4 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary " + (waveStyle === 'bars' ? ' border-primary bg-primary text-primary-foreground' : ' border-border bg-muted text-muted-foreground hover:border-primary/50')}
                    aria-label="Select bars style"
                    aria-pressed={waveStyle === 'bars'}
                    role="button"
                    tabIndex={0}
                  >
                    Bars
                  </button>
                  <button
                    onClick={() => setWaveStyle('line')}
                    className={"px-4 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary " + (waveStyle === 'line' ? ' border-primary bg-primary text-primary-foreground' : ' border-border bg-muted text-muted-foreground hover:border-primary/50')}
                    aria-label="Select line style"
                    aria-pressed={waveStyle === 'line'}
                    role="button"
                    tabIndex={0}
                  >
                    Line
                  </button>
                </div>
              </div>
              
              {waveStyle === 'bars' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Bar Width</label>
                  <div className="flex gap-3">
                    {[1, 2, 3].map(width => (
                      <button
                        key={width}
                        onClick={() => setBarWidth(width)}
                        className={`w-12 h-10 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                          barWidth === width 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                        }`}
                        aria-label={`Set bar width to ${width} pixels`}
                        aria-pressed={barWidth === width}
                        role="button"
                        tabIndex={0}
                      >
                        {width}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Wave Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={waveColor}
                    onChange={(e) => setWaveColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Waveform color"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{waveColor}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Background</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Background color"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{backgroundColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Visualizer */}
      <div className="flex flex-col rounded-xl border border-border bg-card lg:overflow-hidden lg:max-h-[calc(100vh-220px)]">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Waveform Visualizer</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {waveData ? (
            <div className="flex-1 flex flex-col gap-6">
              {/* Waveform */}
              <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full rounded-xl border border-border bg-muted/10"
                />
              </div>

              {/* Export button */}
              <div className="shrink-0">
                <Button 
                  onClick={downloadWaveform} 
                  className="w-full"
                  aria-label="Export waveform as PNG image"
                  disabled={!waveData}
                >
                  <Image className="h-4 w-4 mr-2" aria-hidden="true" />Export PNG <kbd className="ml-2 px-1 rounded bg-white/20 font-mono text-[10px]" aria-hidden="true">Ctrl+E</kbd>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">High-quality waveform export</p>
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No audio file loaded</p>
                <p className="text-xs text-muted-foreground mt-1">Upload an audio file on the left to visualize its waveform</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
    
    <ShortcutsModal
      pageName="Audio Waveform Visualizer"
      shortcuts={[
        { keys: ["Ctrl", "O"], description: "Open audio file" },
        { keys: ["Ctrl", "E"], description: "Export PNG (when waveform loaded)" },
        { keys: ["Ctrl", ","], description: "Show settings" },
        { keys: ["Ctrl", "S"], description: "Hide settings" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    </>
  )
}
