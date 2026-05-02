"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Layers, Upload, Download, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Position =
  | "top-left"    | "top-center"    | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right"

const POS_GRID: Position[][] = [
  ["top-left",    "top-center",    "top-right"],
  ["middle-left", "middle-center", "middle-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
]

const FONTS = [
  { label: "Sans",    value: "sans-serif" },
  { label: "Serif",   value: "serif" },
  { label: "Mono",    value: "monospace" },
  { label: "Cursive", value: "cursive" },
]

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

function renderWatermark(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  text: string,
  opts: { fontSize: number; opacity: number; color: string; fontFamily: string; position: Position; padding: number }
) {
  const { fontSize, opacity, color, fontFamily, position, padding } = opts
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  if (!text.trim()) return

  const minDim = Math.min(canvas.width, canvas.height)
  const actualFontSize = Math.max(8, Math.round(minDim * fontSize / 100))
  const pad = Math.round(minDim * padding / 100)

  ctx.save()
  ctx.font = `bold ${actualFontSize}px ${fontFamily}`
  ctx.textBaseline = "middle"

  const textW = ctx.measureText(text).width
  const textH = actualFontSize * 1.2

  const [vp, hp] = position.split("-")
  const x = hp === "left" ? pad : hp === "center" ? (canvas.width - textW) / 2 : canvas.width - textW - pad
  const y = vp === "top" ? pad + textH / 2 : vp === "middle" ? canvas.height / 2 : canvas.height - pad - textH / 2

  // Outline so text is readable on any background
  ctx.globalAlpha = (opacity / 100) * 0.5
  ctx.strokeStyle = color === "#ffffff" ? "#000000" : "#ffffff"
  ctx.lineWidth = Math.max(1, actualFontSize * 0.08)
  ctx.lineJoin = "round"
  ctx.strokeText(text, x, y)

  ctx.globalAlpha = opacity / 100
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function ImageWatermarkAdder() {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [watermarkText, setWatermarkText] = useState("© CreatorKit")
  const [fontSize, setFontSize] = useState(5)
  const [opacity, setOpacity] = useState(70)
  const [color, setColor] = useState("#ffffff")
  const [fontFamily, setFontFamily] = useState("sans-serif")
  const [position, setPosition] = useState<Position>("bottom-right")
  const [padding, setPadding] = useState(3)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFile = (f: File) => {
    setFileName(f.name)
    setFileSize(f.size)
    setPreviewUrl(null)
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = url
  }

  // Re-render preview whenever image or any setting changes
  useEffect(() => {
    if (!imageEl || !canvasRef.current) return
    const canvas = canvasRef.current
    const scale = Math.min(1, 1600 / Math.max(imageEl.naturalWidth, imageEl.naturalHeight))
    canvas.width = Math.round(imageEl.naturalWidth * scale)
    canvas.height = Math.round(imageEl.naturalHeight * scale)
    renderWatermark(canvas, imageEl, watermarkText, { fontSize, opacity, color, fontFamily, position, padding })
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9))
  }, [imageEl, watermarkText, fontSize, opacity, color, fontFamily, position, padding])

  const download = useCallback(() => {
    if (!imageEl) return
    const canvas = document.createElement("canvas")
    canvas.width = imageEl.naturalWidth
    canvas.height = imageEl.naturalHeight
    renderWatermark(canvas, imageEl, watermarkText, { fontSize, opacity, color, fontFamily, position, padding })
    const isPng = fileName.toLowerCase().endsWith(".png")
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `watermarked_${fileName.replace(/\.[^.]+$/, "")}.${isPng ? "png" : "jpg"}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }, isPng ? "image/png" : "image/jpeg", isPng ? undefined : 0.92)
  }, [imageEl, watermarkText, fontSize, opacity, color, fontFamily, position, padding, fileName])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); download() }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") { e.preventDefault(); inputRef.current?.click() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [download])

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel — settings */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Image Watermark Adder</h1>
              <p className="text-xs text-muted-foreground">Add text watermarks · 100% in-browser</p>
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) handleFile(f) }}
              onClick={() => inputRef.current?.click()}
              className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {imageEl ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{imageEl.naturalWidth} × {imageEl.naturalHeight}px · {formatBytes(fileSize)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageEl(null); setPreviewUrl(null) }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm font-medium">Drop an image here</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+O</kbd></p>
                </div>
              )}
            </div>
          </div>

          {/* Watermark text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Watermark Text</Label>
            <Input
              placeholder="© Your Name"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
            />
          </div>

          {/* Font */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Font</Label>
            <div className="grid grid-cols-4 gap-2">
              {FONTS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFontFamily(f.value)}
                  style={{ fontFamily: f.value }}
                  className={`rounded-md border px-2 py-1.5 text-sm transition-colors ${
                    fontFamily === f.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {[
              { label: "Size", value: fontSize, set: setFontSize, min: 1, max: 20, unit: "%" },
              { label: "Opacity", value: opacity, set: setOpacity, min: 10, max: 100, unit: "%" },
              { label: "Padding from edge", value: padding, set: setPadding, min: 0, max: 15, unit: "%" },
            ].map(({ label, value, set, min, max, unit }) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{label}</Label>
                  <span className="text-xs text-muted-foreground font-mono">{value}{unit}</span>
                </div>
                <Slider min={min} max={max} step={1} value={[value]} onValueChange={([v]) => set(v)} />
              </div>
            ))}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {["#ffffff", "#000000", "#ff0000", "#ffff00"].map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-md border-2 transition-all ${color === c ? "border-primary scale-110" : "border-border"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
              <span className="text-xs text-muted-foreground font-mono">{color}</span>
            </div>
          </div>

          {/* Position grid */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Position</Label>
            <div className="grid grid-cols-3 gap-1.5 w-[126px]">
              {POS_GRID.flat().map((pos) => {
                const [vp, hp] = pos.split("-")
                return (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos as Position)}
                    style={{
                      display: "flex",
                      alignItems: vp === "top" ? "flex-start" : vp === "middle" ? "center" : "flex-end",
                      justifyContent: hp === "left" ? "flex-start" : hp === "center" ? "center" : "flex-end",
                    }}
                    className={`h-10 rounded border p-1.5 transition-colors ${
                      position === pos
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-muted/20"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${position === pos ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">Each square = where the watermark appears</p>
          </div>

        </div>
      </div>

      {/* Right panel — preview */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        <div className="flex-1 overflow-y-auto p-4">
          {!previewUrl ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Layers className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No image yet</p>
                <p className="text-xs text-muted-foreground mt-1">Drop an image — preview updates live as you adjust settings</p>
              </div>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Watermark preview"
              className="w-full rounded-lg border border-border object-contain"
            />
          )}
        </div>
        {previewUrl && (
          <div className="shrink-0 border-t border-border p-4">
            <Button className="w-full" onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download Full Resolution
            </Button>
          </div>
        )}
      </div>

      <ShortcutsModal
        pageName="Image Watermark Adder"
        shortcuts={[
          { keys: ["Ctrl", "S"], description: "Download image" },
          { keys: ["Ctrl", "O"], description: "Open image" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
