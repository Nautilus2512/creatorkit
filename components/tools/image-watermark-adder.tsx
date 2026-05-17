"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Layers, Upload, Download, Check, X, ImageIcon, Type, AlertTriangle } from "lucide-react"
import JSZip from "jszip"
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
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

type Position =
  | "top-left"    | "top-center"    | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right"

type WatermarkType = "text" | "logo"

const MAX_FILES = 30
const WARN_FILES = 20

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

export default function ImageWatermarkAdder() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [previewImageEl, setPreviewImageEl] = useState<HTMLImageElement | null>(null)
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
  const [processing, setProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [currentFile, setCurrentFile] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const inputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileListRef = useRef<HTMLDivElement>(null)

  const addFiles = useCallback((incoming: File[]) => {
    const imageFiles = incoming.filter(f => f.type.startsWith("image/"))
    if (!imageFiles.length) return
    setFiles(prev => [...prev, ...imageFiles].slice(0, MAX_FILES))
    setActiveTab("output")
    announceToScreenReader(`${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""} added`)
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setSelectedFileIndex(prev => {
      if (prev === index) return Math.max(0, index - 1)
      if (prev > index) return prev - 1
      return prev
    })
  }, [])

  // Derive a stable key for the currently selected file
  const selectedFile = files[selectedFileIndex] ?? null
  const selectedFileKey = selectedFile ? `${selectedFile.name}-${selectedFile.size}-${selectedFileIndex}` : ""

  // Auto-scroll file list to keep the selected item visible
  useEffect(() => {
    if (!fileListRef.current) return
    const item = fileListRef.current.children[selectedFileIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [selectedFileIndex])

  // Reload preview image only when selected file actually changes
  useEffect(() => {
    if (!selectedFileKey) {
      setPreviewImageEl(null)
      setPreviewUrl(null)
      return
    }
    const file = files[selectedFileIndex]
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setPreviewImageEl(img)
    img.src = url
    return () => URL.revokeObjectURL(url)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileKey])

  // Re-render preview whenever settings or preview image changes
  useEffect(() => {
    if (!previewImageEl || !canvasRef.current) return
    const canvas = canvasRef.current
    const scale = Math.min(1, 1600 / Math.max(previewImageEl.naturalWidth, previewImageEl.naturalHeight))
    canvas.width = Math.round(previewImageEl.naturalWidth * scale)
    canvas.height = Math.round(previewImageEl.naturalHeight * scale)
    const wc = watermarkType === "text" ? watermarkText : (logoEl || "")
    renderWatermark(canvas, previewImageEl, watermarkType, wc, { fontSize, opacity, color, fontFamily, position, padding, logoSize })
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9))
  }, [previewImageEl, watermarkType, watermarkText, logoEl, fontSize, logoSize, opacity, color, fontFamily, position, padding])

  const handleLogoFile = (f: File) => {
    setLogoFileName(f.name)
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => { setLogoEl(img); URL.revokeObjectURL(url) }
    img.src = url
  }

  const applyBatch = useCallback(async () => {
    if (files.length === 0 || processing) return
    setProcessing(true)
    setProcessedCount(0)
    setCurrentFile("")

    try {
      const zip = new JSZip()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentFile(file.name)
        setProcessedCount(i)

        const url = URL.createObjectURL(file)
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image()
            el.onload = () => resolve(el)
            el.onerror = () => reject(new Error(`Failed to load ${file.name}`))
            el.src = url
          })
          URL.revokeObjectURL(url)

          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const wc = watermarkType === "text" ? watermarkText : (logoEl || "")
          renderWatermark(canvas, img, watermarkType, wc, { fontSize, opacity, color, fontFamily, position, padding, logoSize })

          const isPng = file.name.toLowerCase().endsWith(".png")
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              b => b ? resolve(b) : reject(new Error("toBlob failed")),
              isPng ? "image/png" : "image/jpeg",
              isPng ? undefined : 0.92
            )
          })

          const baseName = file.name.replace(/\.[^.]+$/, "")
          zip.file(`watermarked_${baseName}.${isPng ? "png" : "jpg"}`, blob)
          canvas.width = 0
          canvas.height = 0
        } catch {
          URL.revokeObjectURL(url)
        }
      }

      setProcessedCount(files.length)
      setCurrentFile("Generating ZIP…")

      const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" })
      const url = URL.createObjectURL(zipBlob)
      Object.assign(document.createElement("a"), { href: url, download: `watermarked_batch_${Date.now()}.zip` }).click()
      setTimeout(() => URL.revokeObjectURL(url), 100)

      setDownloading(true)
      announceToScreenReader(`${files.length} images watermarked and downloaded`)
      setTimeout(() => setDownloading(false), 1500)
    } finally {
      setProcessing(false)
      setCurrentFile("")
    }
  }, [files, watermarkType, watermarkText, logoEl, fontSize, logoSize, opacity, color, fontFamily, position, padding])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (inInput && !(e.ctrlKey || e.metaKey)) return

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        if (files.length > 0 && !processing) applyBatch()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        inputRef.current?.click()
        announceToScreenReader("Upload dialog opened")
      }
      if (!inInput && files.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault()
        setSelectedFileIndex(prev => {
          const next = e.key === "ArrowDown"
            ? Math.min(prev + 1, files.length - 1)
            : Math.max(prev - 1, 0)
          if (next !== prev) announceToScreenReader(`Previewing ${files[next].name}`)
          return next
        })
        setActiveTab("output")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [applyBatch, files, processing])

  const applyLabel = processing
    ? `Processing ${processedCount} / ${files.length}…`
    : downloading
    ? "Done!"
    : files.length > 0
    ? `Apply to ${files.length} image${files.length !== 1 ? "s" : ""}`
    : "Apply Watermark"

  return (
    <div className="flex flex-col h-full min-h-0" role="main" aria-label="Image Watermark Adder tool">
      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Image Watermark Adder</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Image Watermark Adder"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "U"], description: "Upload images" },
              { keys: ["Ctrl", "Shift", "S"], description: "Apply watermark and download ZIP" },
              { keys: ["↑", "↓"], description: "Navigate images in list" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
          <Button
            size="sm"
            variant={downloading ? "outline" : "default"}
            onClick={applyBatch}
            disabled={files.length === 0 || processing}
            aria-label={applyLabel}
          >
            {processing ? (
              <><span className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />{applyLabel}</>
            ) : downloading ? (
              <><Check className="h-4 w-4 mr-1" aria-hidden="true" />Done!</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1" aria-hidden="true" />{applyLabel}
                {files.length > 0 && <kbd className="ml-2 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Image Watermark Adder</h2>
          <ShortcutsModal
            pageName="Image Watermark Adder"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "U"], description: "Upload images" },
              { keys: ["Ctrl", "Shift", "S"], description: "Apply watermark and download ZIP" },
              { keys: ["↑", "↓"], description: "Navigate images in list" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Settings
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left panel — two zones: fixed file section + scrollable settings */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="settings-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="settings-panel-label">Watermark Settings</span>
          </div>

          {/* Zone 1 — file upload + list (fixed, always visible) */}
          <div className="shrink-0 border-b border-border p-4 space-y-3" role="group" aria-labelledby="image-upload-label">
            <Label className="text-sm font-medium" id="image-upload-label">
              Images
              {files.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground font-normal">{files.length} / {MAX_FILES}</span>}
            </Label>
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop images here or click to upload"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click() } }}
              className={`relative flex min-h-[72px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = "" } }}
                aria-label="Select image files"
              />
              <div className="flex items-center gap-3 px-4 text-center">
                <div className="rounded-full bg-muted p-2 shrink-0"><Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></div>
                <div className="text-left">
                  <p className="text-xs font-medium">Drop images here or click to add</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP · up to {MAX_FILES} images · <kbd className="hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd></p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.length > WARN_FILES && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400" role="alert" aria-live="polite">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span><span className="font-medium">{files.length} images queued.</span> Processing more than {WARN_FILES} images at once may be slow or fail on older or low-memory devices. Large files increase this risk. Proceed at your own discretion.</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{files.length} image{files.length !== 1 ? "s" : ""} queued</span>
                  <button onClick={() => { setFiles([]); setSelectedFileIndex(0) }} className="text-xs text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded" aria-label="Clear all images">
                    Clear all
                  </button>
                </div>
                <div ref={fileListRef} className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border" role="list" aria-label="Queued images — click to preview">
                  {files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      onClick={() => { setSelectedFileIndex(i); setActiveTab("output"); announceToScreenReader(`Previewing ${file.name}`) }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedFileIndex(i); setActiveTab("output") } }}
                      tabIndex={0}
                      className={`flex items-center gap-2 px-3 py-2 min-w-0 cursor-pointer transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary ${
                        selectedFileIndex === i
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/30 border-transparent"
                      }`}
                      role="listitem"
                      aria-label={`${file.name}${selectedFileIndex === i ? ", currently previewed" : ", click to preview"}`}
                    >
                      <span className={`text-xs shrink-0 w-5 text-right tabular-nums ${selectedFileIndex === i ? "text-primary font-medium" : "text-muted-foreground"}`}>{i + 1}</span>
                      <span className={`flex-1 min-w-0 truncate text-xs ${selectedFileIndex === i ? "text-foreground font-medium" : ""}`}>{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        aria-label={`Remove ${file.name}`}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Zone 2 — watermark settings (independently scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Watermark type */}
            <div className="space-y-2" role="group" aria-labelledby="watermark-type-label">
              <Label className="text-sm font-medium" id="watermark-type-label">Watermark Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["text", "logo"] as WatermarkType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setWatermarkType(t); announceToScreenReader(`${t} watermark selected`) }}
                    aria-pressed={watermarkType === t}
                    aria-label={`${t} watermark`}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      watermarkType === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {t === "text" ? <Type className="h-4 w-4" aria-hidden="true" /> : <ImageIcon className="h-4 w-4" aria-hidden="true" />}
                    {t === "text" ? "Text" : "Logo"}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark content */}
            {watermarkType === "text" ? (
              <div className="space-y-2" role="group" aria-labelledby="watermark-text-label">
                <Label className="text-sm font-medium" id="watermark-text-label">Watermark Text</Label>
                <Input
                  placeholder="© Your Name"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
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
                  onDrop={(e) => { e.preventDefault(); setIsDraggingLogo(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleLogoFile(f) }}
                  onClick={() => logoInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logoInputRef.current?.click() } }}
                  className={`relative flex min-h-[70px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isDraggingLogo ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }} aria-label="Select logo file" />
                  {logoEl ? (
                    <div className="flex items-center gap-3 px-4 w-full">
                      <div className="rounded-md bg-primary/10 p-1.5 shrink-0"><ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{logoFileName}</p>
                        <p className="text-xs text-muted-foreground">{logoEl.naturalWidth} × {logoEl.naturalHeight}px</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setLogoEl(null); setLogoFileName("") }} aria-label="Remove logo" className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                      <div className="rounded-full bg-muted p-2"><Upload className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></div>
                      <p className="text-xs font-medium">Drop a logo here</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WebP</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Font (text only) */}
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
                        fontFamily === f.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sliders */}
            <div className="space-y-4" role="group" aria-label="Watermark adjustment sliders">
              {[
                ...(watermarkType === "text"
                  ? [{ label: "Size", value: fontSize, set: setFontSize, min: 1, max: 20, unit: "%" }]
                  : [{ label: "Logo Size", value: logoSize, set: setLogoSize, min: 5, max: 30, unit: "%" }]
                ),
                { label: "Opacity", value: opacity, set: setOpacity, min: 10, max: 100, unit: "%" },
                { label: "Padding", value: padding, set: setPadding, min: 0, max: 15, unit: "%" },
              ].map(({ label, value, set, min, max, unit }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{label}</Label>
                    <span className="text-xs text-muted-foreground font-mono" aria-live="polite">{value}{unit}</span>
                  </div>
                  <Slider
                    min={min} max={max} step={1} value={[value]}
                    onValueChange={([v]) => set(v)}
                    aria-label={`${label} slider`}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                </div>
              ))}
            </div>

            {/* Color (text only) */}
            {watermarkType === "text" && (
              <div className="space-y-2" role="group" aria-labelledby="color-label">
                <Label className="text-sm font-medium" id="color-label">Color</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[["#ffffff", "White"], ["#000000", "Black"], ["#ff0000", "Red"], ["#ffff00", "Yellow"]].map(([c, name]) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); announceToScreenReader(`${name} color selected`) }}
                      aria-pressed={color === c}
                      aria-label={`${name} color`}
                      className={`h-8 w-8 rounded-md border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${color === c ? "border-primary scale-110" : "border-border"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => { setColor(e.target.value); announceToScreenReader("Custom color selected") }}
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
                      role="radio"
                      aria-checked={position === pos}
                      aria-label={`Position: ${pos.replace(/-/g, " ")}`}
                      style={{ display: "flex", alignItems: vp === "top" ? "flex-start" : vp === "middle" ? "center" : "flex-end", justifyContent: hp === "left" ? "flex-start" : hp === "center" ? "center" : "flex-end" }}
                      className={`h-10 rounded border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${position === pos ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-muted/20"}`}
                    >
                      <div className={`h-2 w-2 rounded-full ${position === pos ? "bg-primary" : "bg-muted-foreground/40"}`} aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Each square = where the watermark appears on every image</p>
            </div>

            {/* Usage guide */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Add images using the drop zone above or <span className="text-foreground font-medium">Ctrl+Shift+U</span>. Up to {MAX_FILES} images per batch.</li>
                <li>Click any image in the list (or press <span className="text-foreground font-medium">↑ / ↓</span>) to preview it with your watermark settings in real time.</li>
                <li>Choose <span className="text-foreground font-medium">Text</span> or <span className="text-foreground font-medium">Logo</span> and adjust size, opacity, padding, and position.</li>
                <li>Press <span className="text-foreground font-medium">Apply</span> or <span className="text-foreground font-medium">Ctrl+Shift+S</span>. All images are processed and downloaded as a single ZIP.</li>
              </ol>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tips</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>Check a few different images in the list to make sure the watermark is visible across light and dark backgrounds.</li>
                  <li>PNG files are saved lossless. JPG files are saved at 92% quality.</li>
                  <li>Processing more than {WARN_FILES} images may be slow on older devices.</li>
                  <li>Everything runs in your browser. Nothing is sent to a server.</li>
                </ul>
              </div>
            </div>
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>

        {/* Right panel — preview */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="preview-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" id="preview-panel-label">
                {processing
                  ? "Processing…"
                  : selectedFile
                  ? `Preview — ${selectedFile.name}`
                  : "Preview"}
              </span>
              {processing && (
                <span className="text-xs text-muted-foreground tabular-nums">{processedCount} / {files.length}</span>
              )}
            </div>
            {files.length > 1 && !processing && (
              <p className="text-[11px] text-muted-foreground">Click any image in the list to switch the preview</p>
            )}
            {processing && (
              <>
                <div
                  className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuenow={processedCount}
                  aria-valuemin={0}
                  aria-valuemax={files.length}
                  aria-label="Batch processing progress"
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${files.length > 0 ? (processedCount / files.length) * 100 : 0}%` }}
                  />
                </div>
                {currentFile && (
                  <p className="text-xs text-muted-foreground truncate" aria-live="polite">{currentFile}</p>
                )}
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          <div className="flex-1 overflow-y-auto p-4">
            {!previewUrl ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                <div className="rounded-full border border-border bg-muted/50 p-4">
                  <Layers className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">No images yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add images — click any file in the list to preview it here</p>
                </div>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt={`Watermark preview of ${selectedFile?.name ?? "image"}`}
                className={`w-full rounded-lg border border-border object-contain transition-opacity ${processing ? "opacity-40" : "opacity-100"}`}
              />
            )}
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>

        </div>
      </div>

      {/* Mobile bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-11 px-4"
          variant={downloading ? "outline" : "default"}
          onClick={applyBatch}
          disabled={files.length === 0 || processing}
          aria-label={applyLabel}
        >
          {processing ? (
            <><span className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />{processedCount}/{files.length}</>
          ) : downloading ? (
            <><Check className="h-4 w-4 mr-1" aria-hidden="true" />Done!</>
          ) : (
            <><Download className="h-4 w-4 mr-1" aria-hidden="true" />Apply {files.length > 0 ? `(${files.length})` : ""}</>
          )}
        </Button>
      </div>
    </div>
  )
}
