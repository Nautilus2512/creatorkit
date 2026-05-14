"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
    const spacing = 1
    const step = Math.ceil(data.length / W)
    
    for (let x = 0; x < W; x += barWidth + spacing) {
      let max = 0
      const startIndex = Math.floor(x * step)
      const endIndex = Math.min(startIndex + step, data.length)
      
      for (let j = startIndex; j < endIndex; j++) {
        const v = Math.abs(data[j] || 0)
        if (v > max) max = v
      }
      const h = Math.max(1, max * mid * 0.95)
      ctx.fillStyle = color
      ctx.fillRect(x, mid - h, barWidth, h * 2)
    }
  } else {
    // Line style with zoom consideration
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

  // Playhead (removed since no playback)
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return
      
      // Ctrl+Shift+O - Open audio file
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "O") {
        e.preventDefault()
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        fileInput?.click()
      }
      // Ctrl+Shift+E - Export PNG
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E" && waveData) {
        e.preventDefault()
        if (e.shiftKey) {
          downloadWaveformSVG()
        } else {
          downloadWaveform()
        }
      }
      // Ctrl+Shift+Shift+E (double shift) - Export SVG (using different approach)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "E" && waveData) {
        e.preventDefault()
        downloadWaveformSVG()
      }
      // Ctrl+Shift+S - Toggle settings
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault()
        setShowSettings(v => !v)
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [waveData])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Click functionality for future use - could be used for seeking when audio is added back
    console.log('Waveform clicked - position:', e.nativeEvent.offsetX)
  }, [])

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

  const downloadWaveformSVG = () => {
    if (!waveData) return
    
    const width = 2000
    const height = 400
    const mid = height / 2
    
    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
    svgContent += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`
    
    if (waveStyle === 'bars') {
      const step = Math.ceil(waveData.length / width)
      for (let x = 0; x < width; x += barWidth + 1) {
        let max = 0
        for (let j = 0; j < step; j++) {
          const v = Math.abs(waveData[x * step + j] || 0)
          if (v > max) max = v
        }
        const h = Math.max(1, max * mid * 0.95)
        svgContent += `<rect x="${x}" y="${mid - h}" width="${barWidth}" height="${h * 2}" fill="${waveColor}"/>`
      }
    } else {
      svgContent += `<polyline points="`
      for (let x = 0; x < width; x++) {
        const index = Math.floor(x * waveData.length / width)
        const y = mid + (waveData[index] * mid * 0.95)
        svgContent += `${x},${y} `
      }
      svgContent += `" fill="none" stroke="${waveColor}" stroke-width="2"/>`
    }
    
    svgContent += '</svg>'
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `waveform-${filename.replace(/\.[^/.]+$/, '')}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setWaveData(null)

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
    try {
      const canvas = canvasRef.current
      drawWaveform(canvas, waveData, 0, {
        color: waveColor,
        backgroundColor,
        style: waveStyle,
        barWidth
      })
    } catch (error) {
      console.error('Waveform rendering error:', error)
    }
  }, [waveData, waveColor, backgroundColor, waveStyle, barWidth])

  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  // Auto-switch to output tab when waveform is generated
  useEffect(() => {
    if (waveData) setActiveTab("output")
  }, [waveData])

  return (
    <div className="flex h-full flex-col" role="main" aria-label="Audio Waveform Visualizer application">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {waveData ? `Waveform loaded for ${filename}. Duration: ${fmtTime(duration)}. Ready to export.` : 'No audio file loaded. Upload a file to visualize its waveform.'}
      </div>

      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Audio Waveform Visualizer</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Audio Waveform Visualizer"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Open audio file" },
              { keys: ["Ctrl", "Shift", "E"], description: "Export as PNG image" },
              { keys: ["Ctrl", "Alt", "E"], description: "Export as SVG vector" },
              { keys: ["Ctrl", "Shift", "S"], description: "Toggle settings panel" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
              { keys: ["Tab"], description: "Navigate between controls" },
              { keys: ["Enter"], description: "Activate focused button" },
              { keys: ["Space"], description: "Select/activate focused item" },
              { keys: ["Arrow Left/Right"], description: "Navigate between style options" },
            ]}
          />
          <Button size="sm" onClick={downloadWaveform} disabled={!waveData}>
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />Download Waveform
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Audio Waveform Visualizer</h2>
          <ShortcutsModal
            pageName="Audio Waveform Visualizer"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Open audio file" },
              { keys: ["Ctrl", "Shift", "E"], description: "Export as PNG image" },
              { keys: ["Ctrl", "Alt", "E"], description: "Export as SVG vector" },
              { keys: ["Ctrl", "Shift", "S"], description: "Toggle settings panel" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
              { keys: ["Tab"], description: "Navigate between controls" },
              { keys: ["Enter"], description: "Activate focused button" },
              { keys: ["Space"], description: "Select/activate focused item" },
              { keys: ["Arrow Left/Right"], description: "Navigate between style options" },
            ]}
          />
        </div>
        <div className="flex" role="tablist">
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

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
      {/* Left panel - Upload and Settings */}
      <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Audio file upload and settings">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium" id="left-panel-heading">Audio File & Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6" tabIndex={-1}>
          {/* Upload area */}
          {!waveData ? (
            <div className="space-y-4" role="group" aria-labelledby="upload-heading">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium" id="upload-heading">Upload Audio File</h3>
                <Button
                  onClick={() => {
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                    fileInput?.click()
                  }}
                  size="sm"
                  variant="outline"
                  aria-label="Browse for audio files"
                >
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />Browse <kbd className="ml-1 px-1 rounded bg-white/20 font-mono text-[10px]" aria-hidden="true">Ctrl+Shift+O</kbd>
                </Button>
              </div>
              
              <label 
                className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                aria-label="Upload audio file - drag and drop or click to select"
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
                  id="audio-file-input"
                />
                <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" aria-hidden="true" />
                <p className="text-xs font-medium text-center">{loading ? "Analyzing audio…" : "Click or drop audio file here"}</p>
                <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, FLAC, M4A</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Supported formats:</span>
                  <div className="flex gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">MP3</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">WAV</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">OGG</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">FLAC</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">M4A</kbd>
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" title={filename}>{filename}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Duration: {duration > 0 ? fmtTime(duration) : 'Unknown'}</p>
                  </div>
                  <Button
                    onClick={() => {
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                      fileInput?.click()
                    }}
                    variant="ghost" 
                    size="sm" 
                    aria-label="Change audio file"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-6">
            <div className="flex items-center justify-between" role="group" aria-labelledby="settings-heading">
              <h4 className="text-sm font-medium" id="settings-heading">Waveform Settings</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSettings(v => !v)}
                aria-label={showSettings ? "Hide settings panel" : "Show settings panel"}
                aria-expanded={showSettings}
              >
                <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                {showSettings ? 'Hide' : 'Show'} <kbd className="ml-1 px-1 rounded bg-white/20 font-mono text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Style</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWaveStyle('bars')}
                    className={"px-4 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 " + (waveStyle === 'bars' ? ' border-primary bg-primary text-primary-foreground' : ' border-border bg-muted text-muted-foreground hover:border-primary/50')}
                    aria-label="Select bars visualization style"
                    aria-pressed={waveStyle === 'bars'}
                    role="radio"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') {
                        e.preventDefault()
                        setWaveStyle('line')
                      }
                    }}
                  >
                    Bars
                  </button>
                  <button
                    onClick={() => setWaveStyle('line')}
                    className={"px-4 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 " + (waveStyle === 'line' ? ' border-primary bg-primary text-primary-foreground' : ' border-border bg-muted text-muted-foreground hover:border-primary/50')}
                    aria-label="Select line visualization style"
                    aria-pressed={waveStyle === 'line'}
                    role="radio"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault()
                        setWaveStyle('bars')
                      }
                    }}
                  >
                    Line
                  </button>
                </div>
              </div>
              
              {waveStyle === 'bars' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Bar Width</label>
                  <div className="flex gap-3" role="radiogroup" aria-label="Bar width selection">
                    {[1, 2, 3].map((width, index) => (
                      <button
                        key={width}
                        onClick={() => setBarWidth(width)}
                        className={`w-12 h-10 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          barWidth === width 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                        }`}
                        aria-label={`Set bar width to ${width} pixels`}
                        aria-pressed={barWidth === width}
                        role="radio"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft' && index > 0) {
                            e.preventDefault()
                            setBarWidth([1, 2, 3][index - 1])
                          } else if (e.key === 'ArrowRight' && index < 2) {
                            e.preventDefault()
                            setBarWidth([1, 2, 3][index + 1])
                          }
                        }}
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
                <label className="text-sm font-medium text-foreground" id="waveform-color-label">Waveform Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={waveColor}
                    onChange={(e) => setWaveColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-labelledby="waveform-color-label"
                    aria-describedby="waveform-color-value"
                  />
                  <span id="waveform-color-value" className="text-sm text-muted-foreground font-mono" aria-live="polite">{waveColor}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground" id="background-color-label">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-labelledby="background-color-label"
                    aria-describedby="background-color-value"
                  />
                  <span id="background-color-value" className="text-sm text-muted-foreground font-mono" aria-live="polite">{backgroundColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Visualizer */}
      <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Waveform visualization">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium" id="right-panel-heading">Waveform Visualizer</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {waveData ? (
            <div className="flex-1 flex flex-col gap-4" role="region" aria-label="Waveform display and export">
              {/* Waveform */}
              <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full rounded-xl border border-border bg-muted/10 cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={handleCanvasClick}
                  role="img"
                  tabIndex={0}
                  aria-label={"Waveform visualization for " + filename + ". Duration: " + fmtTime(duration) + ". Press Enter or Space for future features."}
                />
              </div>

              {/* Export buttons */}
              <div className="flex gap-2" role="group" aria-label="Export options">
                <Button 
                  onClick={downloadWaveform} 
                  className="flex-1"
                  variant="outline"
                  aria-label="Export waveform as PNG image"
                  disabled={!waveData}
                >
                  <Image className="h-4 w-4 mr-2" aria-hidden="true" />Export PNG <kbd className="ml-2 px-1 rounded bg-white/20 font-mono text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
                </Button>
                <Button 
                  onClick={downloadWaveformSVG} 
                  className="flex-1"
                  variant="outline"
                  aria-label="Export waveform as SVG vector image"
                  disabled={!waveData}
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />Export SVG <kbd className="ml-2 px-1 rounded bg-white/20 font-mono text-[10px]" aria-hidden="true">Ctrl+Alt+E</kbd>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">Export in PNG or SVG format • Click waveform for future features</p>
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite">
              <div className="rounded-full border border-border bg-muted/50 p-4" aria-hidden="true">
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

      {/* Mobile bottom action bar */}
      <div className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={downloadWaveform} disabled={!waveData}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />Download
        </Button>
      </div>
    </div>
  )
}
