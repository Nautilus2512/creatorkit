"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Wand2, Upload, Download, X, ImageIcon, Pipette, AlertCircle, ChevronDown, Eraser, Paintbrush, Minus, Plus, Sparkles, RotateCcw, Feather } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

let _processor: any = null
let _model: any = null

async function loadModel(onProgress: (p: number) => void) {
  if (_processor && _model) return
  const { AutoProcessor, AutoModel, env } = await import("@huggingface/transformers")
  if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1
  if (!_processor) _processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4")
  if (!_model) {
    _model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
      dtype: "fp32",
      progress_callback: (d: any) => {
        if (d.status === "progress" && typeof d.progress === "number") onProgress(Math.round(d.progress))
      },
    } as any)
  }
}

async function removeBackgroundAI(imgEl: HTMLImageElement, objectUrl: string): Promise<string> {
  const { RawImage } = await import("@huggingface/transformers")
  const image = await RawImage.fromURL(objectUrl)
  const { pixel_values } = await _processor(image)
  const { output } = await _model({ input: pixel_values })
  const tensor = output[0]
  const dims = tensor.dims
  const mH = Number(dims.length === 4 ? dims[2] : dims[1])
  const mW = Number(dims.length === 4 ? dims[3] : dims[2])
  const maskU8 = new Uint8Array(mH * mW)
  for (let i = 0; i < maskU8.length; i++) maskU8[i] = Math.round(Number(tensor.data[i]) * 255)
  const maskRaw = new RawImage(maskU8, mW, mH, 1)
  const maskResized = await maskRaw.resize(imgEl.naturalWidth, imgEl.naturalHeight)
  const canvas = document.createElement("canvas")
  canvas.width = imgEl.naturalWidth
  canvas.height = imgEl.naturalHeight
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(imgEl, 0, 0)
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < maskResized.data.length; i++) px.data[4 * i + 3] = maskResized.data[i]
  ctx.putImageData(px, 0, 0)
  return canvas.toDataURL("image/png")
}

function removeColorBg(imgEl: HTMLImageElement, rgb: [number, number, number], tolerance: number): string {
  const canvas = document.createElement("canvas")
  canvas.width = imgEl.naturalWidth
  canvas.height = imgEl.naturalHeight
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(imgEl, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const [tr, tg, tb] = rgb
  const threshold = (tolerance / 100) * 441.67
  for (let i = 0; i < data.data.length; i += 4) {
    const diff = Math.sqrt((data.data[i] - tr) ** 2 + (data.data[i + 1] - tg) ** 2 + (data.data[i + 2] - tb) ** 2)
    if (diff <= threshold) data.data[i + 3] = 0
  }
  ctx.putImageData(data, 0, 0)
  return canvas.toDataURL("image/png")
}

// Background eraser: samples color at brush center, erases matching pixels within radius
function magicErase(canvas: HTMLCanvasElement, clientX: number, clientY: number, brushRadius: number, tolerance: number) {
  const ctx = canvas.getContext("2d")!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const cx = (clientX - rect.left) * scaleX
  const cy = (clientY - rect.top) * scaleY
  const r = brushRadius * Math.max(scaleX, scaleY)
  const cxi = Math.round(cx), cyi = Math.round(cy)
  if (cxi < 0 || cxi >= canvas.width || cyi < 0 || cyi >= canvas.height) return
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const si = (cyi * canvas.width + cxi) * 4
  if (data[si + 3] === 0) return
  const hotR = data[si], hotG = data[si + 1], hotB = data[si + 2]
  const threshold = (tolerance / 100) * 441.67
  const ri = Math.ceil(r)
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      if (dx * dx + dy * dy > r * r) continue
      const px = Math.round(cx + dx), py = Math.round(cy + dy)
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue
      const i = (py * canvas.width + px) * 4
      if (data[i + 3] === 0) continue
      const diff = Math.sqrt((data[i] - hotR) ** 2 + (data[i + 1] - hotG) ** 2 + (data[i + 2] - hotB) ** 2)
      if (diff <= threshold) data[i + 3] = 0
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

// Box blur on alpha channel only — feathers the transparent edge
function smoothEdgeAlpha(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!
  const { width, height } = canvas
  const src = ctx.getImageData(0, 0, width, height)
  const dst = new ImageData(new Uint8ClampedArray(src.data), width, height)
  const s = src.data, d = dst.data
  const r = 2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += s[(ny * width + nx) * 4 + 3]
            count++
          }
        }
      }
      const i = (y * width + x) * 4
      d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]
      d[i + 3] = Math.round(sum / count)
    }
  }
  ctx.putImageData(dst, 0, 0)
}

function samplePixel(imgEl: HTMLImageElement, relX: number, relY: number): [number, number, number] {
  const canvas = document.createElement("canvas")
  canvas.width = imgEl.naturalWidth
  canvas.height = imgEl.naturalHeight
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(imgEl, 0, 0)
  const px = Math.max(0, Math.min(imgEl.naturalWidth - 1, Math.floor(relX * imgEl.naturalWidth)))
  const py = Math.max(0, Math.min(imgEl.naturalHeight - 1, Math.floor(relY * imgEl.naturalHeight)))
  const pixel = ctx.getImageData(px, py, 1, 1).data
  return [pixel[0], pixel[1], pixel[2]]
}

function toHex(rgb: [number, number, number]) {
  return "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("")
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

const CHECKER: React.CSSProperties = {
  backgroundImage: "linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
  backgroundColor: "#f9fafb",
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

type Phase = "idle" | "loading-model" | "processing" | "canvas"
type RemovalMethod = "auto" | "magic" | "brush"

export function BackgroundRemover() {
  const [isMobile, setIsMobile]           = useState(false)
  const [imageEl, setImageEl]             = useState<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl]         = useState<string | null>(null)
  const [fileName, setFileName]           = useState("")
  const [fileSize, setFileSize]           = useState(0)
  const [isDragging, setIsDragging]       = useState(false)
  const [phase, setPhase]                 = useState<Phase>("idle")
  const [progress, setProgress]           = useState(0)
  const [error, setError]                 = useState<string | null>(null)
  const [targetColor, setTargetColor]     = useState<[number, number, number]>([255, 255, 255])
  const [tolerance, setTolerance]         = useState(30)
  const [pickingColor, setPickingColor]   = useState(false)
  const [activeTab, setActiveTab]         = useState<"input" | "output">("input")
  const [guideOpen, setGuideOpen]         = useState(false)
  const [brushSize, setBrushSize]         = useState(20)
  const [brushMode, setBrushMode]         = useState<"erase" | "restore">("erase")
  const [removalMethod, setRemovalMethod] = useState<RemovalMethod>("auto")
  const [hasApplied, setHasApplied]       = useState(false)
  const [smoothing, setSmoothing]         = useState(false)
  const [smoothApplied, setSmoothApplied] = useState(false)

  const inputRef           = useRef<HTMLInputElement>(null)
  const canvasRef          = useRef<HTMLCanvasElement | null>(null)
  const originalDataRef    = useRef<ImageData | null>(null)
  const isDraggingOnCanvas = useRef(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  // Draw original image to canvas whenever a new image is loaded
  useEffect(() => {
    if (!imageEl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    canvas.width = imageEl.naturalWidth
    canvas.height = imageEl.naturalHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageEl, 0, 0)
    originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }, [imageEl])

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { announceToScreenReader("Please select a valid image file"); return }
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    const url = URL.createObjectURL(f)
    setObjectUrl(url); setFileName(f.name); setFileSize(f.size)
    setError(null); setHasApplied(false); setSmoothApplied(false)
    setPhase("canvas")
    const img = new Image()
    img.onload = () => {
      setImageEl(img)
      announceToScreenReader(`Image ${f.name} loaded. ${img.naturalWidth} by ${img.naturalHeight} pixels.`)
    }
    img.src = url
  }

  const clearImage = useCallback(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl(null); setImageEl(null); setError(null)
    setPhase("idle"); setPickingColor(false); setActiveTab("input")
    setHasApplied(false); setSmoothApplied(false)
    originalDataRef.current = null
    announceToScreenReader("Image removed. Ready for new upload.")
  }, [objectUrl])

  // Draw a result data URL onto the canvas (used after auto removal)
  const drawResultToCanvas = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setPhase("canvas")
      setHasApplied(true)
      setSmoothApplied(false)
      setActiveTab("output")
      announceToScreenReader("Background removed. Canvas updated.")
    }
    img.src = dataUrl
  }, [])

  const processDesktop = useCallback(async () => {
    if (!imageEl || !objectUrl) return
    setError(null)
    announceToScreenReader("Starting background removal. Loading AI model...")
    try {
      setPhase("loading-model"); setProgress(0)
      await loadModel(p => setProgress(p))
      setPhase("processing")
      announceToScreenReader("AI model loaded. Processing image...")
      const result = await removeBackgroundAI(imageEl, objectUrl)
      drawResultToCanvas(result)
    } catch {
      setError("Something went wrong. Check your internet connection and try again.")
      setPhase("canvas")
      announceToScreenReader("Error during background removal. Please try again.")
    }
  }, [imageEl, objectUrl, drawResultToCanvas])

  const processMobile = useCallback(() => {
    if (!imageEl) return
    announceToScreenReader("Removing background color...")
    drawResultToCanvas(removeColorBg(imageEl, targetColor, tolerance))
  }, [imageEl, targetColor, tolerance, drawResultToCanvas])

  const applyResult = useCallback(() => {
    setHasApplied(true)
    setSmoothApplied(false)
    setActiveTab("output")
    announceToScreenReader("Applied. Use Smooth Edge to soften the cut, or download.")
  }, [])

  const resetCanvas = useCallback(() => {
    if (!imageEl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageEl, 0, 0)
    originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHasApplied(false); setSmoothApplied(false)
    announceToScreenReader("Canvas reset to original image.")
  }, [imageEl])

  const handleApplySmoothEdge = useCallback(() => {
    if (!canvasRef.current || smoothing) return
    setSmoothing(true)
    announceToScreenReader("Applying smooth edge...")
    setTimeout(() => {
      smoothEdgeAlpha(canvasRef.current!)
      setSmoothing(false)
      setSmoothApplied(true)
      announceToScreenReader("Smooth edge applied.")
    }, 16)
  }, [smoothing])

  const download = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `nobg_${fileName.replace(/\.[^.]+$/, "")}.png`
    a.click()
    announceToScreenReader("Download started. Saving as PNG with transparent background.")
  }, [fileName])

  // Unified canvas interaction — routes to magic or brush based on method
  const handleCanvasInteract = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (removalMethod === "magic") {
      magicErase(canvas, clientX, clientY, brushSize, tolerance)
    } else if (removalMethod === "brush") {
      const ctx = canvas.getContext("2d")!
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY
      const r = brushSize * Math.max(scaleX, scaleY)
      if (brushMode === "erase") {
        ctx.save()
        ctx.globalCompositeOperation = "destination-out"
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0,0,0,1)"
        ctx.fill()
        ctx.restore()
      } else {
        if (!originalDataRef.current) return
        const orig = originalDataRef.current
        const curr = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const ri = Math.ceil(r)
        for (let dy = -ri; dy <= ri; dy++) {
          for (let dx = -ri; dx <= ri; dx++) {
            if (dx * dx + dy * dy <= r * r) {
              const px = Math.round(x + dx), py = Math.round(y + dy)
              if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                const i = (py * canvas.width + px) * 4
                curr.data[i] = orig.data[i]; curr.data[i + 1] = orig.data[i + 1]
                curr.data[i + 2] = orig.data[i + 2]; curr.data[i + 3] = orig.data[i + 3]
              }
            }
          }
        }
        ctx.putImageData(curr, 0, 0)
      }
    }
  }, [removalMethod, brushSize, tolerance, brushMode])

  const handleCanvasMouseDown  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => { if (removalMethod === "auto") return; isDraggingOnCanvas.current = true;  handleCanvasInteract(e.clientX, e.clientY) }, [removalMethod, handleCanvasInteract])
  const handleCanvasMouseMove  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => { if (isDraggingOnCanvas.current) handleCanvasInteract(e.clientX, e.clientY) }, [handleCanvasInteract])
  const handleCanvasMouseUp    = useCallback(() => { isDraggingOnCanvas.current = false }, [])
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => { if (removalMethod === "auto") return; e.preventDefault(); isDraggingOnCanvas.current = true;  handleCanvasInteract(e.touches[0].clientX, e.touches[0].clientY) }, [removalMethod, handleCanvasInteract])
  const handleCanvasTouchMove  = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); if (isDraggingOnCanvas.current) handleCanvasInteract(e.touches[0].clientX, e.touches[0].clientY) }, [handleCanvasInteract])
  const handleCanvasTouchEnd   = useCallback(() => { isDraggingOnCanvas.current = false }, [])

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!pickingColor || !imageEl) return
    const rect = e.currentTarget.getBoundingClientRect()
    const color = samplePixel(imageEl, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
    setTargetColor(color); setPickingColor(false)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return
      const isProc = phase === "loading-model" || phase === "processing"
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") { e.preventDefault(); if (imageEl) download() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "U") { e.preventDefault(); if (!isProc) inputRef.current?.click() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault()
        if (removalMethod === "auto" && imageEl && !isProc) { if (isMobile) processMobile(); else processDesktop() }
        else if ((removalMethod === "magic" || removalMethod === "brush") && imageEl) applyResult()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") { e.preventDefault(); if (hasApplied && !smoothing) handleApplySmoothEdge() }
      if (e.key === "Escape" && pickingColor) { e.preventDefault(); setPickingColor(false); announceToScreenReader("Color picking cancelled") }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [phase, imageEl, isMobile, removalMethod, processMobile, processDesktop, applyResult, hasApplied, smoothing, handleApplySmoothEdge, pickingColor, download])

  const isProcessing = phase === "loading-model" || phase === "processing"
  const canvasActive = phase === "canvas" && !!imageEl
  const canInteractOnCanvas = canvasActive && removalMethod !== "auto"

  return (
    <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Background Remover application">

      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Background Remover</span>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={isProcessing} aria-label="Upload image">
          <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
        </Button>
        {hasApplied && (
          <Button size="sm" variant="outline" onClick={handleApplySmoothEdge} disabled={smoothing || smoothApplied} aria-label="Smooth the cut edge">
            {smoothing
              ? <><span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Smoothing...</>
              : <><Feather className="h-4 w-4 mr-1" aria-hidden="true" />{smoothApplied ? "Edge Smoothed ✓" : "Smooth Edge"}<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+F</kbd></>
            }
          </Button>
        )}
        {imageEl && (
          <Button size="sm" variant="outline" onClick={download} aria-label="Download as PNG">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Background Remover"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "Enter"], description: removalMethod === "auto" ? "Remove background" : "Apply" },
              { keys: ["Ctrl", "Shift", "U"], description: "Upload image" },
              { keys: ["Ctrl", "Shift", "F"], description: "Smooth edge" },
              { keys: ["Ctrl", "Shift", "S"], description: "Download" },
            ]}
          />
          {removalMethod === "auto" ? (
            <Button size="sm" onClick={isMobile ? processMobile : processDesktop} disabled={!imageEl || isProcessing} aria-label={isProcessing ? "Processing" : "Remove background"}>
              {isProcessing
                ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />{phase === "loading-model" ? `Loading... ${progress}%` : "Removing..."}</>
                : <><Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />Remove Background<kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Enter</kbd></>
              }
            </Button>
          ) : (
            <Button size="sm" onClick={applyResult} disabled={!imageEl} aria-label="Apply and enable smooth edge">
              {removalMethod === "magic" ? <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" /> : <Eraser className="mr-2 h-4 w-4" aria-hidden="true" />}
              Apply
              <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Enter</kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile compact header */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Background Remover</h2>
          <div className="flex items-center gap-1.5">
            <ShortcutsModal
              pageName="Background Remover"
              shortcuts={[
                { keys: ["Ctrl", "Shift", "Enter"], description: removalMethod === "auto" ? "Remove background" : "Apply" },
                { keys: ["Ctrl", "Shift", "U"], description: "Upload image" },
                { keys: ["Ctrl", "Shift", "F"], description: "Smooth edge" },
                { keys: ["Ctrl", "Shift", "S"], description: "Download" },
              ]}
            />
          </div>
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Canvas
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Left panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-border bg-card`}>
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Upload & Settings</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Method selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Removal Method</Label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                  <button onClick={() => setRemovalMethod("auto")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors ${removalMethod === "auto" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-pressed={removalMethod === "auto"} aria-label="Auto removal">
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Auto
                  </button>
                  <button onClick={() => setRemovalMethod("magic")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors border-l border-border ${removalMethod === "magic" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-pressed={removalMethod === "magic"} aria-label="Magic eraser">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Magic
                  </button>
                  <button onClick={() => setRemovalMethod("brush")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors border-l border-border ${removalMethod === "brush" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-pressed={removalMethod === "brush"} aria-label="Manual brush">
                    <Eraser className="h-3.5 w-3.5" aria-hidden="true" />Brush
                  </button>
                </div>
              </div>

              {/* Mode info */}
              {removalMethod === "auto" && (
                <div className={`rounded-lg border px-3 py-2.5 text-xs space-y-1 ${isMobile ? "border-amber-500/20 bg-amber-500/5" : "border-blue-500/20 bg-blue-500/5"}`}>
                  {isMobile
                    ? <><p className="font-medium text-amber-700 dark:text-amber-400">Lightweight Mode — mobile</p><p className="text-muted-foreground">Removes solid backgrounds by color. For complex images, try on desktop.</p></>
                    : <><p className="font-medium text-blue-700 dark:text-blue-400">AI Mode — desktop</p><p className="text-muted-foreground">Downloads a ~40 MB AI model on first use (cached after that). Removes any background automatically.</p></>
                  }
                </div>
              )}
              {removalMethod === "magic" && (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 text-xs space-y-1">
                  <p className="font-medium text-violet-700 dark:text-violet-400">Magic Eraser — paint by color</p>
                  <p className="text-muted-foreground">Paint over background. The brush samples the color at its tip and only removes matching pixels — safe to brush near foreground objects.</p>
                </div>
              )}
              {removalMethod === "brush" && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-xs space-y-1">
                  <p className="font-medium text-green-700 dark:text-green-400">Manual Brush — erase or restore</p>
                  <p className="text-muted-foreground">Paint to erase any area. Switch to Restore to bring pixels back. Available immediately after upload.</p>
                </div>
              )}

              {/* Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="file-upload">Image</Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => !imageEl && inputRef.current?.click()}
                  className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"} ${imageEl ? "cursor-default" : "cursor-pointer"}`}
                  role="button" tabIndex={imageEl ? -1 : 0}
                  aria-label={imageEl ? "Image uploaded" : "Upload image"}
                  onKeyDown={(e) => { if (!imageEl && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click() } }}
                >
                  <input ref={inputRef} id="file-upload" type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  {imageEl ? (
                    <div className="flex items-center gap-3 px-4 w-full">
                      <div className="rounded-md bg-primary/10 p-2 shrink-0" aria-hidden="true"><ImageIcon className="h-5 w-5 text-primary" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={fileName}>{fileName}</p>
                        <p className="text-xs text-muted-foreground">{imageEl.naturalWidth}×{imageEl.naturalHeight}px · {formatBytes(fileSize)}</p>
                      </div>
                      <button onClick={clearImage} disabled={isProcessing} aria-label="Remove image"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <div className="rounded-full bg-muted p-3" aria-hidden="true"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                      <p className="text-sm font-medium">Drop an image here</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WebP · <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Brush controls (Brush mode) */}
              {removalMethod === "brush" && imageEl && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Brush Mode</Label>
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                      <button onClick={() => setBrushMode("erase")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors ${brushMode === "erase" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        aria-pressed={brushMode === "erase"}>
                        <Eraser className="h-3.5 w-3.5" aria-hidden="true" />Erase
                      </button>
                      <button onClick={() => setBrushMode("restore")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors border-l border-border ${brushMode === "restore" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        aria-pressed={brushMode === "restore"}>
                        <Paintbrush className="h-3.5 w-3.5" aria-hidden="true" />Restore
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Brush Size</Label>
                      <span className="text-xs text-muted-foreground font-mono">{brushSize}px</span>
                    </div>
                    <Slider min={5} max={100} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} aria-label="Brush size" />
                  </div>
                </div>
              )}

              {/* Magic eraser controls */}
              {removalMethod === "magic" && imageEl && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Brush Size</Label>
                      <span className="text-xs text-muted-foreground font-mono">{brushSize}px</span>
                    </div>
                    <Slider min={5} max={100} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} aria-label="Brush size" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Color Tolerance</Label>
                      <span className="text-xs text-muted-foreground font-mono">{tolerance}%</span>
                    </div>
                    <Slider min={1} max={80} step={1} value={[tolerance]} onValueChange={([v]) => setTolerance(v)} aria-label="Color tolerance" />
                    <p className="text-xs text-muted-foreground">Higher = brush tip erases a wider range of similar colors.</p>
                  </div>
                </div>
              )}

              {/* Auto mobile color picker */}
              {removalMethod === "auto" && isMobile && imageEl && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium" id="color-label">Background Color to Remove</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="h-9 w-9 rounded-md border-2 border-border shrink-0" style={{ backgroundColor: toHex(targetColor) }} role="img" aria-label={`Selected color ${toHex(targetColor)}`} />
                      <button
                        onClick={() => { setPickingColor(v => !v); announceToScreenReader(pickingColor ? "Color picking disabled" : "Tap the background in the canvas to pick its color.") }}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${pickingColor ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
                        aria-pressed={pickingColor}>
                        <Pipette className="h-3.5 w-3.5" aria-hidden="true" />{pickingColor ? "Click canvas →" : "Pick from image"}
                      </button>
                      <input type="color" value={toHex(targetColor)}
                        onChange={e => { const h = e.target.value; setTargetColor([parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]) }}
                        className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        aria-labelledby="color-label" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Tolerance</Label>
                      <span className="text-xs text-muted-foreground font-mono">{tolerance}%</span>
                    </div>
                    <Slider min={1} max={80} step={1} value={[tolerance]} onValueChange={([v]) => setTolerance(v)} aria-label="Tolerance" />
                    <p className="text-xs text-muted-foreground">Higher = removes more similar shades.</p>
                  </div>
                </div>
              )}

              {/* Auto desktop progress */}
              {removalMethod === "auto" && !isMobile && isProcessing && (
                <div className="space-y-2" role="region" aria-label="Processing status" aria-live="polite">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{phase === "loading-model" ? "Downloading AI model..." : "Removing background..."}</span>
                    {phase === "loading-model" && <span>{progress}%</span>}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" role="progressbar"
                    aria-valuenow={phase === "loading-model" ? progress : 100} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: phase === "loading-model" ? `${progress}%` : "100%", animation: phase === "processing" ? "pulse 1.5s ease-in-out infinite" : "none" }} />
                  </div>
                  {phase === "loading-model" && progress < 5 && (
                    <p className="text-xs text-muted-foreground">First use — downloading ~40 MB AI model. Cached after this.</p>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" /><span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — always shows canvas when image is loaded */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 bg-card`}
            role="region" aria-label="Canvas">
            <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                {!imageEl ? "Canvas" : removalMethod === "magic" ? "Magic Eraser — paint to remove by color" : removalMethod === "brush" ? `Brush — ${brushMode === "erase" ? "erasing" : "restoring"}` : "Canvas"}
              </span>
              {imageEl && (
                <button onClick={resetCanvas} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1" aria-label="Reset canvas to original image">
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />Reset
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!imageEl ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                  <div className="rounded-full border border-border bg-muted/50 p-4" aria-hidden="true"><Wand2 className="h-6 w-6 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">No image yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload an image to start editing</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />
                      {phase === "loading-model" ? "Loading AI model..." : "Removing background..."}
                    </div>
                  )}
                  {canInteractOnCanvas && (
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      {removalMethod === "magic" ? "Paint over background areas to erase by color. Only the color under your brush tip is removed." : brushMode === "erase" ? "Paint to erase. Switch to Restore to bring pixels back." : "Paint to restore erased pixels."}
                    </p>
                  )}
                  {removalMethod === "auto" && canvasActive && !hasApplied && (
                    <p className="text-xs text-muted-foreground">Original image — click <span className="text-foreground font-medium">Remove Background</span> to process.</p>
                  )}
                  {hasApplied && (
                    <p className="text-xs text-muted-foreground">
                      Result ready.{!smoothApplied && " Click "}{!smoothApplied && <><span className="text-foreground font-medium">Smooth Edge</span> in the toolbar to soften the cut.</>}
                      {smoothApplied && " Smooth edge applied."}
                    </p>
                  )}
                  <div className="rounded-lg overflow-hidden border border-border" style={CHECKER}>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto block select-none"
                      style={{ touchAction: canInteractOnCanvas ? "none" : "auto", cursor: canInteractOnCanvas ? "crosshair" : "default" }}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      onTouchStart={handleCanvasTouchStart}
                      onTouchMove={handleCanvasTouchMove}
                      onTouchEnd={handleCanvasTouchEnd}
                      onClick={pickingColor && removalMethod === "auto" && isMobile ? (e) => {
                        if (!imageEl) return
                        const canvas = canvasRef.current!
                        const rect = canvas.getBoundingClientRect()
                        const color = samplePixel(imageEl, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
                        setTargetColor(color); setPickingColor(false)
                      } : undefined}
                      aria-label="Editing canvas"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <button onClick={() => setGuideOpen(v => !v)}
            className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            aria-expanded={guideOpen} aria-controls="bg-remover-guide">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${guideOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {guideOpen && (
            <div id="bg-remover-guide" className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Workflow</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Upload an image. The original appears on the canvas immediately.</li>
                  <li>Choose a removal method: <span className="text-foreground font-medium">Auto</span>, <span className="text-foreground font-medium">Magic Eraser</span>, or <span className="text-foreground font-medium">Brush</span>. You can switch between them freely without losing canvas edits.</li>
                  <li>Paint or process. The canvas updates live as you work.</li>
                  <li>Click <span className="text-foreground font-medium">Apply</span> (or wait for Auto to finish) to unlock <span className="text-foreground font-medium">Smooth Edge</span> in the toolbar.</li>
                  <li>Optionally apply Smooth Edge, then download as PNG.</li>
                </ol>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Auto mode</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>Desktop: AI model (~40 MB, cached after first use) removes any background automatically.</li>
                  <li>Mobile: removes a solid background by color. Pick the color from the image and set Tolerance.</li>
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Magic Eraser</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>Paint over background areas. The brush samples the color at its center tip and removes only matching pixels within the brush radius.</li>
                  <li>Dragging near a foreground object is safe — the brush stops erasing it because the tip detects a different color.</li>
                  <li>Adjust Brush Size and Color Tolerance for control. Use a smaller brush near edges.</li>
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Manual Brush</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li><span className="text-foreground font-medium">Erase</span> removes everything within the brush circle, regardless of color.</li>
                  <li><span className="text-foreground font-medium">Restore</span> brings back pixels from the most recent reference state (original, or last auto/applied result). Switch to it any time to fix mistakes.</li>
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Smooth Edge</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>Applies a soft blur to the transparent edge, removing hard pixel-level jaggedness.</li>
                  <li>Available after clicking Apply or after Auto removal completes.</li>
                  <li>Use <span className="text-foreground font-medium">Reset</span> to start over from the original image.</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Everything runs in your browser. Nothing is sent to a server.</p>
            </div>
          )}
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* Mobile bottom action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <Button size="sm" variant="outline" className="h-11 px-4" onClick={() => inputRef.current?.click()} disabled={isProcessing} aria-label="Upload image">
          <Upload className="h-4 w-4" aria-hidden="true" />
        </Button>
        {removalMethod === "brush" && imageEl && (
          <>
            <Button size="sm" variant={brushMode === "erase" ? "default" : "outline"} className="h-11 px-3"
              onClick={() => setBrushMode("erase")} aria-pressed={brushMode === "erase"} aria-label="Erase mode">
              <Eraser className="h-4 w-4 mr-1" aria-hidden="true" />Erase
            </Button>
            <Button size="sm" variant={brushMode === "restore" ? "default" : "outline"} className="h-11 px-3"
              onClick={() => setBrushMode("restore")} aria-pressed={brushMode === "restore"} aria-label="Restore mode">
              <Paintbrush className="h-4 w-4 mr-1" aria-hidden="true" />Restore
            </Button>
            <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={() => setBrushSize(s => Math.max(5, s - 10))} aria-label="Smaller brush"><Minus className="h-4 w-4" aria-hidden="true" /></Button>
            <span className="text-xs text-muted-foreground font-mono w-7 text-center shrink-0" aria-live="polite">{brushSize}</span>
            <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={() => setBrushSize(s => Math.min(100, s + 10))} aria-label="Larger brush"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
            <Button size="sm" className="h-11 flex-1" onClick={applyResult} disabled={!imageEl} aria-label="Apply">Apply</Button>
          </>
        )}
        {removalMethod === "magic" && imageEl && (
          <>
            <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={() => setBrushSize(s => Math.max(5, s - 10))} aria-label="Smaller brush"><Minus className="h-4 w-4" aria-hidden="true" /></Button>
            <span className="text-xs text-muted-foreground font-mono w-7 text-center shrink-0">{brushSize}</span>
            <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={() => setBrushSize(s => Math.min(100, s + 10))} aria-label="Larger brush"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
            <Button size="sm" className="h-11 flex-1" onClick={applyResult} disabled={!imageEl} aria-label="Apply magic eraser">
              <Sparkles className="h-4 w-4 mr-1" aria-hidden="true" />Apply
            </Button>
          </>
        )}
        {removalMethod === "auto" && (
          <Button size="sm" className="h-11 flex-1" onClick={isMobile ? processMobile : processDesktop} disabled={!imageEl || isProcessing} aria-label="Remove background">
            {isProcessing
              ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />{phase === "loading-model" ? `Loading... ${progress}%` : "Removing..."}</>
              : <><Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />Remove Background</>
            }
          </Button>
        )}
        {hasApplied && (
          <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={handleApplySmoothEdge} disabled={smoothing || smoothApplied} aria-label="Smooth edge">
            {smoothing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" /> : <Feather className="h-4 w-4" aria-hidden="true" />}
          </Button>
        )}
        {imageEl && (
          <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={download} aria-label="Download">
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
