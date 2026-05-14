"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Wand2, Upload, Download, X, ImageIcon, Pipette, AlertCircle, ChevronDown, Eraser, Paintbrush, Minus, Plus, Sparkles, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Module-level model cache (persists across re-renders)
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

// BFS flood fill — erases connected pixels within color tolerance
function floodFill(canvas: HTMLCanvasElement, startX: number, startY: number, tolerance: number) {
  const ctx = canvas.getContext("2d")!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const si = (startY * width + startX) * 4
  if (data[si + 3] === 0) return // already transparent — nothing to do

  const targetR = data[si], targetG = data[si + 1], targetB = data[si + 2]
  const threshold = (tolerance / 100) * 441.67

  const visited = new Uint8Array(width * height)
  const stack: number[] = [startY * width + startX]

  while (stack.length > 0) {
    const pos = stack.pop()!
    if (visited[pos]) continue
    visited[pos] = 1

    const idx = pos * 4
    if (data[idx + 3] === 0) continue

    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    const diff = Math.sqrt((r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2)
    if (diff > threshold) continue

    data[idx + 3] = 0

    const x = pos % width
    const y = (pos - x) / width
    if (x > 0)          stack.push(pos - 1)
    if (x < width - 1)  stack.push(pos + 1)
    if (y > 0)          stack.push(pos - width)
    if (y < height - 1) stack.push(pos + width)
  }

  ctx.putImageData(imageData, 0, 0)
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

type Phase = "idle" | "loading-model" | "processing" | "done" | "editing"
type RemovalMethod = "auto" | "magic"

export function BackgroundRemover() {
  const [isMobile, setIsMobile]           = useState(false)
  const [imageEl, setImageEl]             = useState<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl]         = useState<string | null>(null)
  const [fileName, setFileName]           = useState("")
  const [fileSize, setFileSize]           = useState(0)
  const [resultUrl, setResultUrl]         = useState<string | null>(null)
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
  const [magicResetKey, setMagicResetKey] = useState(0)

  const inputRef        = useRef<HTMLInputElement>(null)
  const editCanvasRef   = useRef<HTMLCanvasElement | null>(null)
  const originalDataRef = useRef<ImageData | null>(null)
  const isEditDragging  = useRef(false)
  const magicCanvasRef  = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (phase === "done" || phase === "editing") setActiveTab("output")
  }, [phase])

  // Initialize magic eraser canvas when method or image changes
  useEffect(() => {
    if (removalMethod !== "magic" || !imageEl || !magicCanvasRef.current) return
    const canvas = magicCanvasRef.current
    const ctx = canvas.getContext("2d")!
    canvas.width = imageEl.naturalWidth
    canvas.height = imageEl.naturalHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageEl, 0, 0)
  }, [removalMethod, imageEl, magicResetKey])

  // Initialize brush editing canvas when entering edit mode
  useEffect(() => {
    if (phase !== "editing" || !resultUrl || !editCanvasRef.current) return
    const canvas = editCanvasRef.current
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    }
    img.src = resultUrl
  }, [phase, resultUrl])

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      announceToScreenReader("Please select a valid image file")
      return
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    const url = URL.createObjectURL(f)
    setObjectUrl(url)
    setFileName(f.name)
    setFileSize(f.size)
    setResultUrl(null)
    setError(null)
    setPhase("idle")
    setMagicResetKey(k => k + 1)
    const img = new Image()
    img.onload = () => {
      setImageEl(img)
      announceToScreenReader(`Image ${f.name} loaded. ${img.naturalWidth} by ${img.naturalHeight} pixels.`)
    }
    img.src = url
  }

  const clearImage = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl(null); setImageEl(null); setResultUrl(null)
    setError(null); setPhase("idle"); setPickingColor(false)
    setActiveTab("input"); originalDataRef.current = null
    setMagicResetKey(k => k + 1)
    announceToScreenReader("Image removed. Ready for new upload.")
  }

  const processDesktop = useCallback(async () => {
    if (!imageEl || !objectUrl) return
    setError(null); setResultUrl(null)
    announceToScreenReader("Starting background removal. Loading AI model...")
    try {
      setPhase("loading-model"); setProgress(0)
      await loadModel(p => setProgress(p))
      setPhase("processing")
      announceToScreenReader("AI model loaded. Processing image...")
      const result = await removeBackgroundAI(imageEl, objectUrl)
      setResultUrl(result); setPhase("done")
      announceToScreenReader("Background removal complete. Result ready for download.")
    } catch {
      setError("Something went wrong. Check your internet connection and try again.")
      setPhase("idle")
      announceToScreenReader("Error during background removal. Please try again.")
    }
  }, [imageEl, objectUrl])

  const processMobile = useCallback(() => {
    if (!imageEl) return
    announceToScreenReader("Removing background color...")
    setResultUrl(removeColorBg(imageEl, targetColor, tolerance))
    setPhase("done")
    announceToScreenReader("Background removal complete. Result ready for download.")
  }, [imageEl, targetColor, tolerance])

  const applyMagic = useCallback(() => {
    const canvas = magicCanvasRef.current
    if (!canvas) return
    setResultUrl(canvas.toDataURL("image/png"))
    setPhase("done")
    announceToScreenReader("Magic eraser applied. Result ready for download.")
  }, [])

  const resetMagic = useCallback(() => {
    setMagicResetKey(k => k + 1)
    announceToScreenReader("Canvas reset to original image.")
  }, [])

  const handleMagicClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = magicCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    floodFill(canvas, x, y, tolerance)
    announceToScreenReader("Area removed. Tap more areas or click Apply.")
  }, [tolerance])

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!pickingColor || !imageEl) return
    const rect = e.currentTarget.getBoundingClientRect()
    const color = samplePixel(imageEl, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
    setTargetColor(color)
    setPickingColor(false)
  }

  const download = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement("a")
    a.href = resultUrl
    a.download = `nobg_${fileName.replace(/\.[^.]+$/, "")}.png`
    a.click()
    announceToScreenReader("Download started. Saving as PNG with transparent background.")
  }, [resultUrl, fileName])

  // -- Brush editing --

  const paint = useCallback((clientX: number, clientY: number) => {
    const canvas = editCanvasRef.current
    if (!canvas) return
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
            const px = Math.round(x + dx)
            const py = Math.round(y + dy)
            if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
              const i = (py * canvas.width + px) * 4
              curr.data[i]     = orig.data[i]
              curr.data[i + 1] = orig.data[i + 1]
              curr.data[i + 2] = orig.data[i + 2]
              curr.data[i + 3] = orig.data[i + 3]
            }
          }
        }
      }
      ctx.putImageData(curr, 0, 0)
    }
  }, [brushSize, brushMode])

  const handleEditMouseDown  = useCallback((e: React.MouseEvent) => { isEditDragging.current = true;  paint(e.clientX, e.clientY) }, [paint])
  const handleEditMouseMove  = useCallback((e: React.MouseEvent) => { if (isEditDragging.current) paint(e.clientX, e.clientY) }, [paint])
  const handleEditMouseUp    = useCallback(() => { isEditDragging.current = false }, [])
  const handleEditTouchStart = useCallback((e: React.TouchEvent) => { e.preventDefault(); isEditDragging.current = true;  paint(e.touches[0].clientX, e.touches[0].clientY) }, [paint])
  const handleEditTouchMove  = useCallback((e: React.TouchEvent) => { e.preventDefault(); if (isEditDragging.current) paint(e.touches[0].clientX, e.touches[0].clientY) }, [paint])
  const handleEditTouchEnd   = useCallback(() => { isEditDragging.current = false }, [])

  const enterEditing = useCallback(() => {
    setBrushMode("erase")
    setPhase("editing")
    announceToScreenReader("Edit mode active. Paint to erase or restore areas.")
  }, [])

  const finishEditing = useCallback(() => {
    const canvas = editCanvasRef.current
    if (!canvas) return
    setResultUrl(canvas.toDataURL("image/png"))
    setPhase("done")
    announceToScreenReader("Edits saved. Result updated.")
  }, [])

  const cancelEditing = useCallback(() => {
    setPhase("done")
    announceToScreenReader("Edit cancelled. Original result restored.")
  }, [])

  // -- Keyboard shortcuts --
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return
      const isProcessingNow = phase === "loading-model" || phase === "processing"

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault()
        if (resultUrl && phase !== "editing") download()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "U") {
        e.preventDefault()
        if (phase !== "editing") inputRef.current?.click()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault()
        if (phase === "editing") { finishEditing(); return }
        if (removalMethod === "magic" && imageEl && phase !== "done") { applyMagic(); return }
        if (imageEl && !isProcessingNow && phase !== "editing") {
          if (isMobile) processMobile(); else processDesktop()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
        e.preventDefault()
        if (resultUrl && phase === "done") enterEditing()
        else if (phase === "editing") finishEditing()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        if (pickingColor) { setPickingColor(false); announceToScreenReader("Color picking mode cancelled") }
        if (phase === "editing") cancelEditing()
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [download, pickingColor, isMobile, processMobile, processDesktop, phase, imageEl, resultUrl, enterEditing, finishEditing, cancelEditing, applyMagic, removalMethod])

  const isProcessing = phase === "loading-model" || phase === "processing"

  // Derived: is magic canvas active (image loaded, magic method, not done/editing)
  const isMagicActive = removalMethod === "magic" && !!imageEl && phase !== "done" && phase !== "editing"

  return (
    <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Background Remover application">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === "editing"
          ? "Edit mode active. Paint to erase or restore areas."
          : isMagicActive
            ? "Magic eraser ready. Click on background areas to remove them, then click Apply."
            : imageEl
              ? `Image loaded: ${fileName}. ${resultUrl ? "Result ready." : "Press Ctrl+Shift+Enter to remove background."}`
              : "No image loaded. Press Ctrl+Shift+U to upload."}
      </div>

      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        {phase === "editing" ? (
          <>
            <span className="text-sm font-semibold shrink-0 mr-1">Background Remover</span>
            <span className="text-xs text-muted-foreground shrink-0">Brush Edit</span>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium shrink-0">
              <button
                onClick={() => setBrushMode("erase")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${brushMode === "erase" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                aria-pressed={brushMode === "erase"} aria-label="Erase mode"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />Erase
              </button>
              <button
                onClick={() => setBrushMode("restore")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-l border-border ${brushMode === "restore" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                aria-pressed={brushMode === "restore"} aria-label="Restore mode"
              >
                <Paintbrush className="h-3.5 w-3.5" aria-hidden="true" />Restore
              </button>
            </div>
            <div className="flex items-center gap-2 ml-1">
              <span className="text-xs text-muted-foreground shrink-0">Size</span>
              <Slider min={5} max={80} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} className="w-28" aria-label="Brush size" />
              <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">{brushSize}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={cancelEditing} aria-label="Cancel editing">Cancel</Button>
              <Button size="sm" onClick={finishEditing} aria-label="Save edits">
                Save Edits
                <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Enter</kbd>
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold shrink-0 mr-1">Background Remover</span>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} aria-label="Upload image">
              <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Upload
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
            </Button>
            {resultUrl && (
              <>
                <Button size="sm" variant="outline" onClick={enterEditing} aria-label="Edit result with brush">
                  <Eraser className="h-4 w-4 mr-1" aria-hidden="true" />Edit
                  <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
                </Button>
                <Button size="sm" variant="outline" onClick={download} aria-label="Download result as PNG">
                  <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
                  <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
                </Button>
              </>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <ShortcutsModal
                pageName="Background Remover"
                shortcuts={[
                  { keys: ["Ctrl", "Shift", "Enter"], description: removalMethod === "magic" ? "Apply magic eraser" : "Remove background" },
                  { keys: ["Ctrl", "Shift", "U"], description: "Upload image" },
                  { keys: ["Ctrl", "Shift", "E"], description: "Edit result with brush" },
                  { keys: ["Ctrl", "Shift", "S"], description: "Download result" },
                ]}
              />
              {removalMethod === "magic" ? (
                <Button
                  size="sm"
                  onClick={applyMagic}
                  disabled={!imageEl || phase === "done"}
                  aria-label="Apply magic eraser and generate result"
                >
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  Apply Magic Eraser
                  <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Enter</kbd>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={isMobile ? processMobile : processDesktop}
                  disabled={!imageEl || isProcessing}
                  aria-label={isProcessing ? "Processing in progress" : "Remove background from image"}
                >
                  {isProcessing ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />
                      {phase === "loading-model" ? `Loading model... ${progress}%` : "Removing..."}
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Remove Background
                      <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Enter</kbd>
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">
            {phase === "editing" ? "Brush Edit" : "Background Remover"}
          </h2>
          <div className="flex items-center gap-1.5">
            {phase !== "editing" && (
              <ShortcutsModal
                pageName="Background Remover"
                shortcuts={[
                  { keys: ["Ctrl", "Shift", "Enter"], description: removalMethod === "magic" ? "Apply magic eraser" : "Remove background" },
                  { keys: ["Ctrl", "Shift", "U"], description: "Upload image" },
                  { keys: ["Ctrl", "Shift", "E"], description: "Edit result with brush" },
                  { keys: ["Ctrl", "Shift", "S"], description: "Download result" },
                ]}
              />
            )}
          </div>
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            {phase === "editing" ? "Edit" : removalMethod === "magic" && isMagicActive ? "Erase" : "Result"}
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Panels card */}
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
                  <button
                    onClick={() => { setRemovalMethod("auto"); setPhase("idle") }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors ${removalMethod === "auto" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-pressed={removalMethod === "auto"}
                    aria-label="Auto background removal"
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Auto
                  </button>
                  <button
                    onClick={() => { setRemovalMethod("magic"); setPhase("idle") }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 transition-colors border-l border-border ${removalMethod === "magic" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-pressed={removalMethod === "magic"}
                    aria-label="Magic eraser"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Magic Eraser
                  </button>
                </div>
              </div>

              {/* Mode info */}
              {removalMethod === "auto" ? (
                <div
                  className={`rounded-lg border px-3 py-2.5 text-xs space-y-1 ${isMobile ? "border-amber-500/20 bg-amber-500/5" : "border-blue-500/20 bg-blue-500/5"}`}
                  role="region" aria-label="Mode information"
                >
                  {isMobile ? (
                    <>
                      <p className="font-medium text-amber-700 dark:text-amber-400">Lightweight Mode — mobile</p>
                      <p className="text-muted-foreground">Removes solid or simple backgrounds by color. For complex backgrounds, try on a desktop browser.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-blue-700 dark:text-blue-400">AI Model Mode — desktop</p>
                      <p className="text-muted-foreground">Downloads a ~40 MB AI model on first use (cached after that). Removes any background automatically.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 text-xs space-y-1" role="region" aria-label="Magic eraser info">
                  <p className="font-medium text-violet-700 dark:text-violet-400">Magic Eraser — click to remove</p>
                  <p className="text-muted-foreground">Click any background area in the right panel. Connected pixels of similar color are removed instantly. Click multiple areas, then press Apply.</p>
                </div>
              )}

              {/* Upload */}
              <div className="space-y-2" role="region" aria-label="Image upload section">
                <Label className="text-sm font-medium" htmlFor="file-upload">Image</Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => !imageEl && inputRef.current?.click()}
                  className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  } ${imageEl ? "cursor-default" : "cursor-pointer"}`}
                  role="button"
                  tabIndex={imageEl ? -1 : 0}
                  aria-label={imageEl ? "Image uploaded" : "Upload image"}
                  aria-describedby="upload-formats"
                  onKeyDown={(e) => { if (!imageEl && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click() } }}
                >
                  <input ref={inputRef} id="file-upload" type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} aria-label="Select image file" />
                  {imageEl ? (
                    <div className="flex items-center gap-3 px-4 w-full">
                      <div className="rounded-md bg-primary/10 p-2 shrink-0" aria-hidden="true"><ImageIcon className="h-5 w-5 text-primary" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={fileName}>{fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {imageEl.naturalWidth}×{imageEl.naturalHeight}px · {formatBytes(fileSize)}
                        </p>
                      </div>
                      <button onClick={clearImage} disabled={isProcessing || phase === "editing"} aria-label="Remove image"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <div className="rounded-full bg-muted p-3" aria-hidden="true"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                      <p className="text-sm font-medium">Drop an image here</p>
                      <p className="text-xs text-muted-foreground" id="upload-formats">
                        JPG, PNG, WebP ·{" "}
                        <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
                      </p>
                      <span className="sr-only">Press Ctrl plus Shift plus U to browse for files</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tolerance — shown for magic eraser (any device) and auto mobile */}
              {imageEl && (removalMethod === "magic" || (removalMethod === "auto" && isMobile)) && (
                <div className="space-y-4">
                  {/* Color picker for auto mobile only */}
                  {removalMethod === "auto" && isMobile && (
                    <div className="space-y-2" role="region" aria-label="Background color removal settings">
                      <Label className="text-sm font-medium" id="color-label">Background Color to Remove</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-9 w-9 rounded-md border-2 border-border shrink-0" style={{ backgroundColor: toHex(targetColor) }}
                          role="img" aria-label={`Selected color ${toHex(targetColor)}`} />
                        <button
                          onClick={() => { setPickingColor(v => !v); announceToScreenReader(pickingColor ? "Color picking disabled" : "Color picking enabled. Click image to select.") }}
                          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${pickingColor ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
                          aria-pressed={pickingColor} aria-label={pickingColor ? "Disable color picker" : "Enable color picker"}
                        >
                          <Pipette className="h-3.5 w-3.5" aria-hidden="true" />
                          {pickingColor ? "Click image →" : "Pick from image"}
                        </button>
                        <input type="color" value={toHex(targetColor)}
                          onChange={e => {
                            const h = e.target.value
                            setTargetColor([parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])
                          }}
                          className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          aria-labelledby="color-label" />
                      </div>
                    </div>
                  )}
                  {/* Tolerance slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium" id="tolerance-label">
                        {removalMethod === "magic" ? "Color Tolerance" : "Tolerance"}
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono" id="tolerance-value" aria-live="polite">{tolerance}%</span>
                    </div>
                    <Slider min={1} max={80} step={1} value={[tolerance]}
                      onValueChange={([v]) => setTolerance(v)}
                      aria-labelledby="tolerance-label" aria-describedby="tolerance-value" />
                    <p className="text-xs text-muted-foreground">
                      {removalMethod === "magic"
                        ? "Higher = each click removes a wider range of similar colors."
                        : "Higher = removes more similar shades. Lower = more precise."}
                    </p>
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
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar" aria-valuenow={phase === "loading-model" ? progress : 100} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: phase === "loading-model" ? `${progress}%` : "100%", animation: phase === "processing" ? "pulse 1.5s ease-in-out infinite" : "none" }} />
                  </div>
                  {phase === "loading-model" && progress < 5 && (
                    <p className="text-xs text-muted-foreground">First use — downloading ~40 MB AI model. Cached after this, never downloaded again.</p>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-400"
                  role="alert" aria-live="assertive" aria-atomic="true">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

            </div>
          </div>

          {/* Right panel */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 bg-card`}
            role="region"
            aria-label={phase === "editing" ? "Brush editing canvas" : isMagicActive ? "Magic eraser canvas" : "Image preview and results"}
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">
                {phase === "editing"
                  ? "Brush Edit — paint to erase or restore"
                  : isMagicActive
                    ? "Magic Eraser — click background areas to remove"
                    : "Result"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">

              {phase === "editing" ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {brushMode === "erase" ? "Paint over areas to make them transparent." : "Paint over erased areas to bring them back."}
                  </p>
                  <div className="rounded-lg overflow-hidden border border-border" style={CHECKER}>
                    <canvas
                      ref={editCanvasRef}
                      className="w-full h-auto block select-none"
                      style={{ touchAction: "none", cursor: "crosshair" }}
                      onMouseDown={handleEditMouseDown}
                      onMouseMove={handleEditMouseMove}
                      onMouseUp={handleEditMouseUp}
                      onMouseLeave={handleEditMouseUp}
                      onTouchStart={handleEditTouchStart}
                      onTouchMove={handleEditTouchMove}
                      onTouchEnd={handleEditTouchEnd}
                      aria-label="Brush editing canvas"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Esc</kbd> to cancel without saving.
                  </p>
                </div>
              ) : isMagicActive ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Click any background area to erase it</p>
                    <button
                      onClick={resetMagic}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
                      aria-label="Reset magic eraser canvas to original image"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />Reset
                    </button>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border" style={CHECKER}>
                    <canvas
                      ref={magicCanvasRef}
                      className="w-full h-auto block select-none cursor-crosshair"
                      onClick={handleMagicClick}
                      aria-label="Magic eraser canvas — click to remove background areas"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adjust <span className="text-foreground font-medium">Color Tolerance</span> in the settings panel, then click Apply when done.
                  </p>
                </div>
              ) : !imageEl ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                  <div className="rounded-full border border-border bg-muted/50 p-4" aria-hidden="true">
                    <Wand2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No image yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Drop an image to get started or press{" "}
                      <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> to browse
                    </p>
                  </div>
                </div>
              ) : resultUrl ? (
                <div className="space-y-3" role="region" aria-label="Background removal result">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground" id="result-label">Result — transparent background</p>
                    <button
                      onClick={() => { setResultUrl(null); setPhase("idle"); setMagicResetKey(k => k + 1); announceToScreenReader("Result cleared.") }}
                      className="text-xs text-muted-foreground hover:text-foreground underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
                      aria-label="Clear result and try again"
                    >
                      Try again
                    </button>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border" style={CHECKER} role="img" aria-labelledby="result-label">
                    <img src={resultUrl} alt="Image with background removed" className="w-full h-auto max-w-full object-contain block" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3" role="region" aria-label="Original image preview">
                  <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                    {pickingColor ? "Click on the background area to pick its color" : "Original image"}
                  </p>
                  <div className={`rounded-lg overflow-hidden border border-border relative ${pickingColor ? "cursor-crosshair ring-2 ring-primary" : ""}`}>
                    <img src={objectUrl!} alt={pickingColor ? "Click image to select background color" : "Original uploaded image"}
                      className="w-full h-auto max-w-full object-contain block" onClick={handleImageClick} />
                    {pickingColor && (
                      <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-end justify-center pb-4">
                        <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium shadow">Click any background area</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>{/* end panels card */}

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <button
            onClick={() => setGuideOpen(v => !v)}
            className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            aria-expanded={guideOpen} aria-controls="bg-remover-guide"
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${guideOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {guideOpen && (
            <div id="bg-remover-guide" className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Auto removal</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Select <span className="text-foreground font-medium">Auto</span> method, upload an image, then press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+Enter</kbd>.</li>
                  <li>On desktop, the AI model downloads once (~40 MB) and is cached. It handles complex backgrounds including hair and fur.</li>
                  <li>On mobile, the tool removes a solid background by color. Pick the color from the image and adjust Tolerance for best results.</li>
                </ol>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Magic Eraser</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Select <span className="text-foreground font-medium">Magic Eraser</span> method and upload an image.</li>
                  <li>Click or tap any background area in the right panel. All connected pixels of similar color are removed instantly.</li>
                  <li>Adjust <span className="text-foreground font-medium">Color Tolerance</span> before each click to control how many similar shades are included.</li>
                  <li>Click <span className="text-foreground font-medium">Reset</span> to undo all fills and start over. Click <span className="text-foreground font-medium">Apply Magic Eraser</span> when done.</li>
                </ol>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Brush editing</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>After any removal method, click <span className="text-foreground font-medium">Edit</span> to open the brush editor.</li>
                  <li><span className="text-foreground font-medium">Erase mode</span> paints transparency to clean up leftover background areas.</li>
                  <li><span className="text-foreground font-medium">Restore mode</span> brings back pixels removed by mistake, restoring from the state after removal.</li>
                  <li>Click <span className="text-foreground font-medium">Save Edits</span> to apply, or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Esc</kbd> to cancel.</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Everything runs in your browser. Nothing is sent to a server.</p>
            </div>
          )}
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />

      </div>{/* end scrollable content */}

      {/* Mobile bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {phase === "editing" ? (
          <>
            <Button size="sm" variant={brushMode === "erase" ? "default" : "outline"} className="h-11 px-3"
              onClick={() => setBrushMode("erase")} aria-pressed={brushMode === "erase"} aria-label="Erase mode">
              <Eraser className="h-4 w-4 mr-1" aria-hidden="true" />Erase
            </Button>
            <Button size="sm" variant={brushMode === "restore" ? "default" : "outline"} className="h-11 px-3"
              onClick={() => setBrushMode("restore")} aria-pressed={brushMode === "restore"} aria-label="Restore mode">
              <Paintbrush className="h-4 w-4 mr-1" aria-hidden="true" />Restore
            </Button>
            <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={() => setBrushSize(s => Math.max(5, s - 10))} aria-label="Decrease brush size">
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="text-xs text-muted-foreground font-mono text-center w-7 shrink-0" aria-live="polite">{brushSize}</span>
            <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={() => setBrushSize(s => Math.min(80, s + 10))} aria-label="Increase brush size">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="sm" className="h-11 flex-1" onClick={finishEditing} aria-label="Save edits">Save</Button>
          </>
        ) : removalMethod === "magic" ? (
          <>
            <Button size="sm" variant="outline" className="h-11 px-4" onClick={() => inputRef.current?.click()} aria-label="Upload image">
              <Upload className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="sm" className="h-11 px-4 flex-1" onClick={applyMagic} disabled={!imageEl || phase === "done"} aria-label="Apply magic eraser">
              <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />Apply
            </Button>
            {resultUrl && (
              <>
                <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={enterEditing} aria-label="Edit result with brush">
                  <Eraser className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={download} aria-label="Download result">
                  <Download className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-11 px-4" onClick={() => inputRef.current?.click()} aria-label="Upload image">
              <Upload className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="sm" className="h-11 px-4 flex-1"
              onClick={isMobile ? processMobile : processDesktop}
              disabled={!imageEl || isProcessing} aria-label={isProcessing ? "Processing" : "Remove background"}>
              {isProcessing ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />
                  {phase === "loading-model" ? `Loading... ${progress}%` : "Removing..."}
                </>
              ) : (
                <><Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />Remove Background</>
              )}
            </Button>
            {resultUrl && (
              <>
                <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={enterEditing} aria-label="Edit result with brush">
                  <Eraser className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="sm" variant="outline" className="h-11 w-11 shrink-0" onClick={download} aria-label="Download result">
                  <Download className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
