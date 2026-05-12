"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Layers, Upload, Download, X, ImageIcon, Type, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

type Position =
  | "top-left"    | "top-center"    | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right"

type WatermarkType = "text" | "logo"

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
  watermarkType: WatermarkType,
  watermarkContent: string | HTMLImageElement,
  opts: { fontSize: number; opacity: number; color: string; fontFamily: string; position: Position; padding: number; logoSize: number }
) {
  const { fontSize, opacity, color, fontFamily, position, padding, logoSize } = opts
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  if (watermarkType === "text" && typeof watermarkContent === "string") {
    if (!watermarkContent.trim()) return
    const minDim = Math.min(canvas.width, canvas.height)
    const actualFontSize = Math.max(8, Math.round(minDim * fontSize / 100))
    const pad = Math.round(minDim * padding / 100)

    ctx.save()
    ctx.font = `bold ${actualFontSize}px ${fontFamily}`
    ctx.textBaseline = "middle"

    const textW = ctx.measureText(watermarkContent).width
    const textH = actualFontSize * 1.2

    const [vp, hp] = position.split("-")
    const x = hp === "left" ? pad : hp === "center" ? (canvas.width - textW) / 2 : canvas.width - textW - pad
    const y = vp === "top" ? pad + textH / 2 : vp === "middle" ? canvas.height / 2 : canvas.height - pad - textH / 2

    ctx.globalAlpha = (opacity / 100) * 0.5
    ctx.strokeStyle = color === "#ffffff" ? "#000000" : "#ffffff"
    ctx.lineWidth = Math.max(1, actualFontSize * 0.08)
    ctx.lineJoin = "round"
    ctx.strokeText(watermarkContent, x, y)

    ctx.globalAlpha = opacity / 100
    ctx.fillStyle = color
    ctx.fillText(watermarkContent, x, y)
    ctx.restore()
  } else if (watermarkType === "logo" && watermarkContent instanceof HTMLImageElement) {
    const minDim = Math.min(canvas.width, canvas.height)
    const actualLogoSize = Math.max(20, Math.round(minDim * logoSize / 100))
    const pad = Math.round(minDim * padding / 100)

    ctx.save()
    ctx.globalAlpha = opacity / 100

    const [vp, hp] = position.split("-")
    const x = hp === "left" ? pad : hp === "center" ? (canvas.width - actualLogoSize) / 2 : canvas.width - actualLogoSize - pad
    const y = vp === "top" ? pad : vp === "middle" ? (canvas.height - actualLogoSize) / 2 : canvas.height - actualLogoSize - pad

    ctx.drawImage(watermarkContent, x, y, actualLogoSize, actualLogoSize)
    ctx.restore()
  }
}

export function ImageWatermarkAdder() {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text")
  const [watermarkText, setWatermarkText] = useState("© CreatorKit")
  const [logoEl, setLogoEl] = useState<HTMLImageElement | null>(null)
  const [logoFileName, setLogoFileName] = useState("")
  const [fontSize, setFontSize] = useState(5)
  const [logoSize, setLogoSize] = useState(10)
  const [opacity, setOpacity] = useState(70)
  const [color, setColor] = useState("#ffffff")
  const [fontFamily, setFontFamily] = useState("sans-serif")
  const [position, setPosition] = useState<Position>("bottom-right")
  const [padding, setPadding] = useState(3)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingLogo, setIsDraggingLogo] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
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

  const handleLogoFile = (f: File) => {
    setLogoFileName(f.name)
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setLogoEl(img)
    img.src = url
  }

  // Re-render preview whenever image or any setting changes
  useEffect(() => {
    if (!imageEl || !canvasRef.current) return
    const canvas = canvasRef.current
    const scale = Math.min(1, 1600 / Math.max(imageEl.naturalWidth, imageEl.naturalHeight))
    canvas.width = Math.round(imageEl.naturalWidth * scale)
    canvas.height = Math.round(imageEl.naturalHeight * scale)
    const watermarkContent = watermarkType === "text" ? watermarkText : (logoEl || "")
    renderWatermark(canvas, imageEl, watermarkType, watermarkContent, { fontSize, opacity, color, fontFamily, position, padding, logoSize })
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9))
  }, [imageEl, watermarkType, watermarkText, logoEl, fontSize, logoSize, opacity, color, fontFamily, position, padding])

  const download = useCallback(() => {
    if (!imageEl) return
    const canvas = document.createElement("canvas")
    canvas.width = imageEl.naturalWidth
    canvas.height = imageEl.naturalHeight
    const watermarkContent = watermarkType === "text" ? watermarkText : (logoEl || "")
    renderWatermark(canvas, imageEl, watermarkType, watermarkContent, { fontSize, opacity, color, fontFamily, position, padding, logoSize })
    const isPng = fileName.toLowerCase().endsWith(".png")
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `watermarked_${fileName.replace(/\.[^.]+$/, "")}.${isPng ? "png" : "jpg"}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
      setDownloaded(true)
      announceToScreenReader("Image downloaded with watermark")
      setTimeout(() => setDownloaded(false), 2000)
    }, isPng ? "image/png" : "image/jpeg", isPng ? undefined : 0.92)
  }, [imageEl, watermarkType, watermarkText, logoEl, fontSize, logoSize, opacity, color, fontFamily, position, padding, fileName])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); if (imageEl) { download(); announceToScreenReader("Downloading watermarked image") } }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); inputRef.current?.click(); announceToScreenReader("Upload dialog opened") }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [download, imageEl])

  return (
    <>
    <ShortcutsModal
      pageName="Image Watermark Adder"
      shortcuts={[
        { keys: ["Ctrl", "Shift", "S"], description: "Download image" },
        { keys: ["Ctrl", "Shift", "O"], description: "Open image" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    <div className="flex h-full flex-col gap-3 p-4" role="main" aria-label="Image Watermark Adder tool">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Image Watermark Adder</h2>
        <p className="text-muted-foreground">Add text or logo watermarks · 100% in-browser · Press ? for shortcuts</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
      {/* Left panel — settings */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="settings-panel-label">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium" id="settings-panel-label">Watermark Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Upload */}
          <div className="space-y-2" role="group" aria-labelledby="image-upload-label">
            <Label className="text-sm font-medium" id="image-upload-label">Image</Label>
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop image here or click to upload"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) { handleFile(f); announceToScreenReader(`${f.name} added`) } }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click() } }}
              className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFile(f); announceToScreenReader(`${f.name} added`) } }} aria-label="Select image file" />
              {imageEl ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0">
                    <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{imageEl.naturalWidth} × {imageEl.naturalHeight}px · {formatBytes(fileSize)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageEl(null); setPreviewUrl(null); announceToScreenReader("Image removed") }}
                    aria-label="Remove image"
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></div>
                  <p className="text-sm font-medium">Drop an image here</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP · <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+O</kbd></p>
                </div>
              )}
            </div>
          </div>

          {/* Watermark type selector */}
          <div className="space-y-2" role="group" aria-labelledby="watermark-type-label">
            <Label className="text-sm font-medium" id="watermark-type-label">Watermark Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setWatermarkType("text"); announceToScreenReader("Text watermark selected") }}
                aria-pressed={watermarkType === "text"}
                aria-label="Text watermark"
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  watermarkType === "text"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Type className="h-4 w-4" aria-hidden="true" />
                Text
              </button>
              <button
                onClick={() => { setWatermarkType("logo"); announceToScreenReader("Logo watermark selected") }}
                aria-pressed={watermarkType === "logo"}
                aria-label="Logo watermark"
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  watermarkType === "logo"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Logo
              </button>
            </div>
          </div>

          {/* Watermark content based on type */}
          {watermarkType === "text" ? (
            <div className="space-y-2" role="group" aria-labelledby="watermark-text-label">
              <Label className="text-sm font-medium" id="watermark-text-label">Watermark Text</Label>
              <Input
                placeholder="© Your Name"
                value={watermarkText}
                onChange={(e) => { setWatermarkText(e.target.value); announceToScreenReader(`Watermark text: ${e.target.value}`) }}
                aria-label="Watermark text input"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          ) : (
            <div className="space-y-2" role="group" aria-labelledby="logo-upload-label">
              <Label className="text-sm font-medium" id="logo-upload-label">Logo Image</Label>
              <div
                role="button"
                tabIndex={0}
                aria-label="Drop logo here or click to upload"
                onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true) }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={(e) => { e.preventDefault(); setIsDraggingLogo(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) { handleLogoFile(f); announceToScreenReader(`${f.name} logo added`) } }}
                onClick={() => logoInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logoInputRef.current?.click() } }}
                className={`relative flex min-h-[80px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isDraggingLogo ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleLogoFile(f); announceToScreenReader(`${f.name} logo added`) } }} aria-label="Select logo file" />
                {logoEl ? (
                  <div className="flex items-center gap-3 px-4 w-full">
                    <div className="rounded-md bg-primary/10 p-2 shrink-0">
                      <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{logoFileName}</p>
                      <p className="text-xs text-muted-foreground">{logoEl.naturalWidth} × {logoEl.naturalHeight}px</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLogoEl(null); setLogoFileName(""); announceToScreenReader("Logo removed") }}
                      aria-label="Remove logo"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <div className="rounded-full bg-muted p-2"><Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></div>
                    <p className="text-xs font-medium">Drop a logo here</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Font - only show for text watermarks */}
          {watermarkType === "text" && (
            <div className="space-y-2" role="group" aria-labelledby="font-label">
              <Label className="text-sm font-medium" id="font-label">Font</Label>
              <div className="grid grid-cols-4 gap-2">
                {FONTS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setFontFamily(f.value); announceToScreenReader(`${f.label} font selected`) }}
                    style={{ fontFamily: f.value }}
                    aria-pressed={fontFamily === f.value}
                    aria-label={`${f.label} font`}
                    className={`rounded-md border px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
          )}

          {/* Sliders */}
          <div className="space-y-4" role="group" aria-label="Watermark settings sliders">
            {[
              ...(watermarkType === "text" 
                ? [{ label: "Size", value: fontSize, set: setFontSize, min: 1, max: 20, unit: "%", ariaLabel: "Watermark size" }]
                : [{ label: "Logo Size", value: logoSize, set: setLogoSize, min: 5, max: 30, unit: "%", ariaLabel: "Logo size" }]
              ),
              { label: "Opacity", value: opacity, set: setOpacity, min: 10, max: 100, unit: "%", ariaLabel: "Watermark opacity" },
              { label: "Padding from edge", value: padding, set: setPadding, min: 0, max: 15, unit: "%", ariaLabel: "Padding from edge" },
            ].map(({ label, value, set, min, max, unit, ariaLabel }) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id={`${label.toLowerCase().replace(/\s/g, "-")}-label`}>{label}</Label>
                  <span className="text-xs text-muted-foreground font-mono" aria-live="polite">{value}{unit}</span>
                </div>
                <Slider 
                  min={min} 
                  max={max} 
                  step={1} 
                  value={[value]} 
                  onValueChange={([v]) => { set(v); announceToScreenReader(`${label} ${v}${unit}`) }} 
                  aria-label={ariaLabel}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
            ))}
          </div>

          {/* Color - only show for text watermarks */}
          {watermarkType === "text" && (
            <div className="space-y-2" role="group" aria-labelledby="color-label">
              <Label className="text-sm font-medium" id="color-label">Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {["#ffffff", "#000000", "#ff0000", "#ffff00"].map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); announceToScreenReader(`${c} color selected`) }}
                    aria-pressed={color === c}
                    aria-label={`${c === "#ffffff" ? "white" : c === "#000000" ? "black" : c === "#ff0000" ? "red" : "yellow"} color`}
                    className={`h-8 w-8 rounded-md border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${color === c ? "border-primary scale-110" : "border-border"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => { setColor(e.target.value); announceToScreenReader(`Custom color ${e.target.value} selected`) }}
                  className="h-8 w-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Custom color picker"
                />
                <span className="text-xs text-muted-foreground font-mono" aria-live="polite">{color}</span>
              </div>
            </div>
          )}

          {/* Position grid */}
          <div className="space-y-2" role="group" aria-labelledby="position-label">
            <Label className="text-sm font-medium" id="position-label">Position</Label>
            <div className="grid grid-cols-3 gap-1.5 w-[126px]" role="radiogroup" aria-label="Watermark position">
              {POS_GRID.flat().map((pos) => {
                const [vp, hp] = pos.split("-")
                return (
                  <button
                    key={pos}
                    onClick={() => { setPosition(pos as Position); announceToScreenReader(`Position: ${pos.replace(/-/g, " ")}`) }}
                    aria-pressed={position === pos}
                    aria-label={`Position: ${pos.replace(/-/g, " ")}`}
                    role="radio"
                    aria-checked={position === pos}
                    style={{
                      display: "flex",
                      alignItems: vp === "top" ? "flex-start" : vp === "middle" ? "center" : "flex-end",
                      justifyContent: hp === "left" ? "flex-start" : hp === "center" ? "center" : "flex-end",
                    }}
                    className={`h-10 rounded border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      position === pos
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-muted/20"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${position === pos ? "bg-primary" : "bg-muted-foreground/40"}`} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground" id="position-help">Each square = where the watermark appears</p>
          </div>

        </div>
      </div>

      {/* Right panel — preview */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="preview-panel-label">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium" id="preview-panel-label">Preview</span>
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        <div className="flex-1 overflow-y-auto p-4">
          {!previewUrl ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Layers className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">No image yet</p>
                <p className="text-xs text-muted-foreground mt-1">Drop an image — preview updates live as you adjust settings</p>
              </div>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Watermark preview - shows how your watermarked image will look"
              className="w-full rounded-lg border border-border object-contain"
            />
          )}
        </div>
        {previewUrl && (
          <div className="shrink-0 border-t border-border p-4">
            <Button 
              className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" 
              onClick={() => download()}
              aria-label={downloaded ? "Image downloaded successfully" : "Download full resolution watermarked image"}
            >
              {downloaded ? <FileCheck className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
              {downloaded ? "Downloaded!" : "Download Full Resolution"}
              {!downloaded && (
                <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] opacity-60" aria-hidden="true">
                  Ctrl+Shift+S
                </kbd>
              )}
            </Button>
          </div>
        )}
      </div>

      </div>
    </div>
    </>
  )
}
