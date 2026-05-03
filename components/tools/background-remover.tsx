"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Wand2, Upload, Download, X, ImageIcon, Pipette, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ── Module-level model cache (persists across re-renders) ────────────────────
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
  const imageResized = image.width > 1024 || image.height > 1024 ? await image.resize(1024, 1024) : image
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

// ── Mobile: canvas color removal ─────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
type Phase = "idle" | "loading-model" | "processing" | "done"

export function BackgroundRemover() {
  const [isMobile, setIsMobile]       = useState(false)
  const [imageEl, setImageEl]         = useState<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl]     = useState<string | null>(null)
  const [fileName, setFileName]       = useState("")
  const [fileSize, setFileSize]       = useState(0)
  const [resultUrl, setResultUrl]     = useState<string | null>(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [phase, setPhase]             = useState<Phase>("idle")
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState<string | null>(null)
  const [targetColor, setTargetColor] = useState<[number, number, number]>([255, 255, 255])
  const [tolerance, setTolerance]     = useState(30)
  const [pickingColor, setPickingColor] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    const url = URL.createObjectURL(f)
    setObjectUrl(url)
    setFileName(f.name)
    setFileSize(f.size)
    setResultUrl(null)
    setError(null)
    setPhase("idle")
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = url
  }

  const clearImage = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl(null); setImageEl(null); setResultUrl(null)
    setError(null); setPhase("idle"); setPickingColor(false)
  }

  const processDesktop = useCallback(async () => {
    if (!imageEl || !objectUrl) return
    setError(null); setResultUrl(null)
    try {
      setPhase("loading-model"); setProgress(0)
      await loadModel(p => setProgress(p))
      setPhase("processing")
      const result = await removeBackgroundAI(imageEl, objectUrl)
      setResultUrl(result); setPhase("done")
    } catch {
      setError("Something went wrong. Check your internet connection and try again.")
      setPhase("idle")
    }
  }, [imageEl, objectUrl])

  const processMobile = useCallback(() => {
    if (!imageEl) return
    setResultUrl(removeColorBg(imageEl, targetColor, tolerance))
    setPhase("done")
  }, [imageEl, targetColor, tolerance])

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
  }, [resultUrl, fileName])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); download() }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") { e.preventDefault(); inputRef.current?.click() }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (isMobile) processMobile(); else processDesktop() }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [download])

  const isProcessing = phase === "loading-model" || phase === "processing"

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2 shrink-0">
              <Wand2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold">Background Remover</h1>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                  isMobile
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  {isMobile ? "Lightweight Mode" : "AI Model"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Remove image backgrounds · 100% in-browser</p>
            </div>
          </div>

          {/* Version info */}
          <div className={`rounded-lg border px-3 py-2.5 text-xs space-y-1 ${
            isMobile ? "border-amber-500/20 bg-amber-500/5" : "border-blue-500/20 bg-blue-500/5"
          }`}>
            {isMobile ? (
              <>
                <p className="font-medium text-amber-700 dark:text-amber-400">Lightweight Mode — mobile</p>
                <p className="text-muted-foreground">Removes solid or simple backgrounds by color. For complex backgrounds (hair, fur, transparent objects), try on a desktop browser.</p>
              </>
            ) : (
              <>
                <p className="font-medium text-blue-700 dark:text-blue-400">AI Model Mode — desktop</p>
                <p className="text-muted-foreground">Downloads a ~40 MB AI model on first use (cached after that). Removes any background automatically.</p>
              </>
            )}
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => !imageEl && inputRef.current?.click()}
              className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              } ${imageEl ? "cursor-default" : "cursor-pointer"}`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {imageEl ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0"><ImageIcon className="h-5 w-5 text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{imageEl.naturalWidth}×{imageEl.naturalHeight}px · {formatBytes(fileSize)}</p>
                  </div>
                  <button onClick={clearImage} disabled={isProcessing} aria-label="Remove image" className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm font-medium">Drop an image here</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+O</kbd></p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile controls */}
          {isMobile && imageEl && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Background Color to Remove</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-9 w-9 rounded-md border-2 border-border shrink-0" style={{ backgroundColor: toHex(targetColor) }} />
                  <button
                    onClick={() => setPickingColor(v => !v)}
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      pickingColor ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Pipette className="h-3.5 w-3.5" />
                    {pickingColor ? "Click image →" : "Pick from image"}
                  </button>
                  <input
                    type="color"
                    value={toHex(targetColor)}
                    onChange={e => {
                      const h = e.target.value
                      setTargetColor([parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)])
                    }}
                    className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Tolerance</Label>
                  <span className="text-xs text-muted-foreground font-mono">{tolerance}%</span>
                </div>
                <Slider min={1} max={80} step={1} value={[tolerance]} onValueChange={([v]) => setTolerance(v)} />
                <p className="text-xs text-muted-foreground">Higher = removes more similar shades. Lower = more precise.</p>
              </div>
            </div>
          )}

          {/* Desktop progress bar */}
          {!isMobile && isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{phase === "loading-model" ? "Downloading AI model…" : "Removing background…"}</span>
                {phase === "loading-model" && <span>{progress}%</span>}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: phase === "loading-model" ? `${progress}%` : "100%",
                    animation: phase === "processing" ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}
                />
              </div>
              {phase === "loading-model" && progress < 5 && (
                <p className="text-xs text-muted-foreground">First use — downloading ~40 MB AI model. Cached after this, never downloaded again.</p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{error}
            </div>
          )}

        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button className="w-full" onClick={isMobile ? processMobile : processDesktop} disabled={!imageEl || isProcessing}>
            {isProcessing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                {phase === "loading-model" ? `Loading model… ${progress}%` : "Removing background…"}
              </>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" />Remove Background
                {!isProcessing && <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]">Ctrl+Enter</kbd>}</>
            )}
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {!imageEl ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Wand2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No image yet</p>
                <p className="text-xs text-muted-foreground mt-1">Drop an image to get started</p>
              </div>
            </div>
          ) : resultUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Result — transparent background</p>
                <button onClick={() => { setResultUrl(null); setPhase("idle") }} className="text-xs text-muted-foreground hover:text-foreground underline">Try again</button>
              </div>
              <div className="rounded-lg overflow-hidden border border-border" style={CHECKER}>
                <img src={resultUrl} alt="Result" className="w-full object-contain" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                {pickingColor ? "Click on the background area to pick its color" : "Original image"}
              </p>
              <div className={`rounded-lg overflow-hidden border border-border relative ${pickingColor ? "cursor-crosshair ring-2 ring-primary" : ""}`}>
                <img
                  src={objectUrl!}
                  alt="Original"
                  className="w-full object-contain"
                  onClick={handleImageClick}
                />
                {pickingColor && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-end justify-center pb-4">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium shadow">Click any background area</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {resultUrl && (
          <div className="shrink-0 border-t border-border p-4">
            <Button className="w-full" onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG (transparent)
              <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]">Ctrl+S</kbd>
            </Button>
          </div>
        )}
      </div>

      <ShortcutsModal
        pageName="Background Remover"
        shortcuts={[
          { keys: ["Ctrl", "S"], description: "Download result" },
          { keys: ["Ctrl", "O"], description: "Open image" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
