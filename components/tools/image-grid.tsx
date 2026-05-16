"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Upload, Download, Trash2, Grip, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
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

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = h / 6
  }
  const l = (max + min) / 2
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return [Math.round(h * 360), s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  label?: string
  shortcut?: string
  id?: string
}

function ColorPicker({ value, onChange, label, shortcut, id }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const pickerRef = useRef<HTMLDivElement>(null)
  const initialHSL = useMemo(() => hexToHSL(value), [value])
  const [h, setH] = useState(initialHSL[0])
  const [s, setS] = useState(initialHSL[1])
  const [l, setL] = useState(initialHSL[2])

  useEffect(() => {
    if (!open) {
      const [nh, ns, nl] = hexToHSL(value)
      setH(nh); setS(ns); setL(nl); setHexInput(value)
    }
  }, [value, open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleSLPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId)
    if (e.type === "pointerup" || (e.buttons === 0 && e.type === "pointermove")) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ns = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const nl = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setS(ns); setL(1 - nl)
    const hex = hslToHex(h, ns, 1 - nl)
    setHexInput(hex); onChange(hex)
  }

  return (
    <div className="relative" ref={pickerRef} id={id}>
      <button
        aria-label={label ?? "Pick color"}
        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen(o => !o)}
      >
        <span className="h-4 w-4 rounded border border-border/50 shrink-0" style={{ backgroundColor: value }} />
        {label && <span className="text-xs">{label}</span>}
        {shortcut && <kbd className="hidden md:inline ml-1 rounded border border-border bg-muted px-1 text-[10px] opacity-50">{shortcut}</kbd>}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl border border-border bg-popover shadow-xl p-3 space-y-2.5"
          style={{ width: "200px" }}
          role="dialog"
          aria-label="Color picker"
        >
          <div
            className="relative h-36 w-full rounded-lg cursor-crosshair select-none"
            style={{ background: `linear-gradient(to right, white, hsl(${h},100%,50%))` }}
            role="presentation"
            onPointerDown={handleSLPointer}
            onPointerMove={handleSLPointer}
            onPointerUp={handleSLPointer}
          >
            <div className="absolute inset-0 rounded-lg" style={{ background: "linear-gradient(to bottom, transparent, black)" }} />
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: `${s * 100}%`, top: `${(1 - l) * 100}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>
          <input
            type="range" min={0} max={360} value={h}
            onChange={e => {
              const nh = Number(e.target.value); setH(nh)
              const hex = hslToHex(nh, s, l); setHexInput(hex); onChange(hex)
            }}
            className="w-full h-3 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
            aria-label="Hue"
          />
          <input
            type="text" value={hexInput}
            onChange={e => {
              setHexInput(e.target.value)
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                const [nh, ns, nl] = hexToHSL(e.target.value)
                setH(nh); setS(ns); setL(nl); onChange(e.target.value)
              }
            }}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Hex color"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}

interface GridImage { id: string; url: string; img: HTMLImageElement; selected?: boolean }

type Layout = "2x2" | "3x3" | "1x3" | "3x1"

const LAYOUTS: { key: Layout; label: string; cols: number; rows: number }[] = [
  { key: "2x2", label: "2×2", cols: 2, rows: 2 },
  { key: "3x3", label: "3×3", cols: 3, rows: 3 },
  { key: "1x3", label: "1×3 row", cols: 3, rows: 1 },
  { key: "3x1", label: "3×1 col", cols: 1, rows: 3 },
]

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

function drawGrid(canvas: HTMLCanvasElement, images: GridImage[], cols: number, rows: number, gap: number, bg: string, draggingCell?: number | null, hoverCell?: number | null) {
  const ctx = canvas.getContext("2d")!
  const cellW = (canvas.width - gap * (cols + 1)) / cols
  const cellH = (canvas.height - gap * (rows + 1)) / rows
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let i = 0
  for (let r = 0; r < rows && i < images.length; r++) {
    for (let c = 0; c < cols && i < images.length; c++) {
      const x = gap + c * (cellW + gap)
      const y = gap + r * (cellH + gap)
      const img = images[i].img
      const scale = Math.max(cellW / img.width, cellH / img.height)
      const sw = cellW / scale, sh = cellH / scale
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
      if (i === draggingCell) ctx.globalAlpha = 0.4
      ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH)
      ctx.globalAlpha = 1
      if (i === hoverCell && draggingCell != null && i !== draggingCell) {
        const lw = Math.max(4, gap > 0 ? gap * 0.6 : 4)
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = lw
        ctx.strokeRect(x + lw / 2, y + lw / 2, cellW - lw, cellH - lw)
      }
      i++
    }
  }
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "U"], description: "Upload images" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download PNG" },
  { keys: ["?"], description: "Toggle this panel" },
]

export default function ImageGrid() {
  const [images, setImages] = useState<GridImage[]>([])
  const [layout, setLayout] = useState<Layout>("2x2")
  const [gap, setGap] = useState(8)
  const [bgColor, setBgColor] = useState("#ffffff")
  const [canvasSize, setCanvasSize] = useState(1200)
  const [currentPage, setCurrentPage] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const [canvasDragging, setCanvasDragging] = useState<number | null>(null)
  const [canvasHover, setCanvasHover] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const downloadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const add = useCallback(async (files: FileList | null) => {
    if (!files) return
    const newImgs = await Promise.all(
      Array.from(files).filter(f => f.type.startsWith("image/")).map(async f => {
        const url = URL.createObjectURL(f)
        const img = await loadImage(url)
        return { id: crypto.randomUUID(), url, img }
      })
    )
    setImages(prev => [...prev, ...newImgs])
    if (newImgs.length > 0) announceToScreenReader(`${newImgs.length} image${newImgs.length > 1 ? "s" : ""} added`)
  }, [])

  const remove = (id: string) =>
    setImages(prev => { const img = prev.find(i => i.id === id); if (img) URL.revokeObjectURL(img.url); return prev.filter(i => i.id !== id) })

  const toggleSelection = (id: string) =>
    setImages(prev => prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img))

  const selectAll = () => {
    const layoutDef = LAYOUTS.find(l => l.key === layout) || LAYOUTS[0]
    const needed = layoutDef.cols * layoutDef.rows
    setImages(prev => prev.slice(0, needed).map(img => ({ ...img, selected: true })))
  }

  const clearSelection = () => setImages(prev => prev.map(img => ({ ...img, selected: false })))

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }
  const handleDragEnter = (index: number) => setDragOverIndex(index)
  const handleDragLeave = () => setDragOverIndex(null)
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return
    setImages(prev => {
      const next = [...prev]
      const item = next[draggedIndex]
      next.splice(draggedIndex, 1)
      next.splice(dropIndex, 0, item)
      return next
    })
    setDraggedIndex(null); setDragOverIndex(null)
  }
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null) }

  const layoutDef = LAYOUTS.find(l => l.key === layout) || LAYOUTS[0]
  const needed = layoutDef.cols * layoutDef.rows
  const totalPages = Math.ceil(images.length / needed)
  const startIndex = currentPage * needed
  const endIndex = Math.min(startIndex + needed, images.length)
  const currentImages = images.slice(startIndex, endIndex)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || currentImages.length === 0) return
    canvas.width = canvasSize
    canvas.height = canvasSize
    drawGrid(canvas, currentImages, layoutDef.cols, layoutDef.rows, gap, bgColor, canvasDragging, canvasHover)
  }, [currentImages, layout, gap, bgColor, canvasSize, currentPage, canvasDragging, canvasHover])

  const download = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const selectedImages = images.filter(img => img.selected)
    const imagesToUse = selectedImages.length > 0 ? selectedImages : currentImages
    if (imagesToUse.length === 0) return
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = canvasSize
    tempCanvas.height = canvasSize
    drawGrid(tempCanvas, imagesToUse, layoutDef.cols, layoutDef.rows, gap, bgColor)
    const a = Object.assign(document.createElement("a"), {
      href: tempCanvas.toDataURL("image/png"),
      download: selectedImages.length > 0 ? "image-grid-selected.png" : "image-grid.png",
    })
    a.click()
    setDownloading(true)
    setActiveTab("output")
    announceToScreenReader("Image grid downloaded")
    if (downloadingTimerRef.current) clearTimeout(downloadingTimerRef.current)
    downloadingTimerRef.current = setTimeout(() => setDownloading(false), 1500)
  }, [images, currentImages, canvasSize, layoutDef, gap, bgColor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("Upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        if (images.length > 0) download()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [images, download])

  useEffect(() => {
    return () => { if (downloadingTimerRef.current) clearTimeout(downloadingTimerRef.current) }
  }, [])

  function getCanvasCellIndex(clientX: number, clientY: number): number | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasSize / rect.width
    const scaleY = canvasSize / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    const cellW = (canvasSize - gap * (layoutDef.cols + 1)) / layoutDef.cols
    const cellH = (canvasSize - gap * (layoutDef.rows + 1)) / layoutDef.rows
    for (let r = 0; r < layoutDef.rows; r++) {
      for (let c = 0; c < layoutDef.cols; c++) {
        const cx = gap + c * (cellW + gap)
        const cy = gap + r * (cellH + gap)
        if (x >= cx && x <= cx + cellW && y >= cy && y <= cy + cellH) return r * layoutDef.cols + c
      }
    }
    return null
  }

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (currentImages.length === 0) return
    const idx = getCanvasCellIndex(e.clientX, e.clientY)
    if (idx === null || idx >= currentImages.length) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setCanvasDragging(idx)
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (canvasDragging === null) return
    const idx = getCanvasCellIndex(e.clientX, e.clientY)
    setCanvasHover(idx !== null && idx < currentImages.length && idx !== canvasDragging ? idx : null)
  }

  function handleCanvasPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (canvasDragging === null) return
    const idx = getCanvasCellIndex(e.clientX, e.clientY)
    if (idx !== null && idx !== canvasDragging && idx < currentImages.length) {
      setImages(prev => {
        const next = [...prev]
        const a = startIndex + canvasDragging
        const b = startIndex + idx
        ;[next[a], next[b]] = [next[b], next[a]]
        return next
      })
      announceToScreenReader(`Image ${canvasDragging + 1} swapped with image ${idx + 1}`)
    }
    setCanvasDragging(null)
    setCanvasHover(null)
  }

  function handleCanvasPointerCancel() {
    setCanvasDragging(null)
    setCanvasHover(null)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Single hidden file input — used by both upload areas and keyboard shortcut */}
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { add(e.target.files); e.target.value = "" }}
        ref={fileInputRef}
        aria-label="Upload images for grid"
      />

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Image Grid controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Image Grid / Collage</span>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1.5" role="group" aria-labelledby="layout-label-desktop">
          <span className="text-xs text-muted-foreground" id="layout-label-desktop">Layout:</span>
          {LAYOUTS.map(l => (
            <button
              key={l.key}
              onClick={() => { setLayout(l.key); announceToScreenReader(`${l.label} layout selected`) }}
              aria-pressed={layout === l.key}
              aria-label={`${l.label} grid layout`}
              className={`text-xs px-2 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${layout === l.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1.5" role="group" aria-labelledby="gap-label-desktop">
          <span className="text-xs text-muted-foreground" id="gap-label-desktop">Gap:</span>
          <Slider
            value={[gap]}
            onValueChange={([v]) => { setGap(v); announceToScreenReader(`${v} pixel gap`) }}
            min={0} max={40} step={2}
            className="w-20"
            aria-label={`Gap ${gap} pixels`}
          />
          <span className="text-xs font-mono text-muted-foreground w-8" aria-live="polite">{gap}px</span>
        </div>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">BG:</span>
          <ColorPicker
            value={bgColor}
            onChange={hex => { setBgColor(hex); announceToScreenReader("Background color changed") }}
          />
        </div>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Size:</span>
          {[800, 1200, 2000].map(sz => (
            <button
              key={sz}
              onClick={() => { setCanvasSize(sz); announceToScreenReader(`${sz} pixel canvas size selected`) }}
              aria-pressed={canvasSize === sz}
              aria-label={`${sz} pixel canvas size`}
              className={`text-xs px-2 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${canvasSize === sz ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            >
              {sz}px
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Image Grid" shortcuts={shortcuts} />
          <Button
            variant={downloading ? "outline" : "default"}
            size="sm"
            onClick={download}
            disabled={images.length === 0}
            aria-label={downloading ? "Image grid downloaded" : "Download image grid as PNG"}
          >
            {downloading ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
            {downloading ? "Downloaded!" : "Download PNG"}
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${downloading ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Image Grid / Collage</h2>
          <ShortcutsModal pageName="Image Grid" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Images
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* PANELS */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

        {/* Input panel */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`} role="region" aria-labelledby="images-panel-label">

          {/* Mobile settings strip */}
          <div className="flex md:hidden flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5" role="group" aria-label="Layout selection">
              <span className="text-xs text-muted-foreground">Layout:</span>
              {LAYOUTS.map(l => (
                <button
                  key={l.key}
                  onClick={() => { setLayout(l.key); announceToScreenReader(`${l.label} layout selected`) }}
                  aria-pressed={layout === l.key}
                  aria-label={`${l.label} grid layout`}
                  className={`text-xs px-2 py-0.5 rounded-full border ${layout === l.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium" id="images-panel-label">Images ({images.length}/{needed})</span>
            <div className="flex items-center gap-2" role="group" aria-label="Image selection actions">
              {images.length > needed && (
                <>
                  <button
                    onClick={() => { selectAll(); announceToScreenReader("All images selected") }}
                    className="text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                    aria-label="Select all images for this page"
                  >Select All</button>
                  <button
                    onClick={() => { clearSelection(); announceToScreenReader("Selection cleared") }}
                    className="text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                    aria-label="Clear image selection"
                  >Clear</button>
                </>
              )}
              {images.length > 0 && (
                <button
                  onClick={() => { setImages([]); setCurrentPage(0); announceToScreenReader("All images cleared") }}
                  className="text-xs text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                  aria-label="Remove all images"
                >Clear All</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {images.length === 0 ? (
              <button
                className="flex-1 flex w-full flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ minHeight: "200px" }}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Click to add images"
              >
                <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
                <p className="text-sm font-medium">Click to add images</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
                <p className="text-xs text-muted-foreground mt-2">
                  or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd>
                </p>
              </button>
            ) : (
              <>
                <button
                  className="flex items-center justify-center gap-2 w-full p-3 cursor-pointer border-b border-border hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add more images"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">Add more images</span>
                </button>
                <p className="text-xs text-muted-foreground text-center py-2 px-4" aria-live="polite">
                  <span className="inline-flex items-center gap-1"><Grip className="h-3 w-3" aria-hidden="true" /> Drag images to reorder</span>
                </p>
                <div className="p-2 space-y-1" role="list" aria-label="Uploaded images">
                  {currentImages.map((img, i) => {
                    const globalIndex = startIndex + i
                    return (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, globalIndex)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(globalIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, globalIndex)}
                        onDragEnd={handleDragEnd}
                        role="listitem"
                        aria-label={`Image ${globalIndex + 1}${img.selected ? ", selected" : ""}`}
                        tabIndex={0}
                        className={`flex items-center gap-2 p-1.5 rounded border transition-all cursor-move focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          img.selected ? "border-primary bg-primary/5" : "border-border"
                        } ${dragOverIndex === globalIndex ? "border-primary bg-primary/10" : ""} group`}
                      >
                        <Grip className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                        <div
                          className="w-10 h-10 object-cover rounded shrink-0 relative"
                          onClick={() => { toggleSelection(img.id); announceToScreenReader(img.selected ? "Image unselected" : "Image selected") }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { toggleSelection(img.id); announceToScreenReader(img.selected ? "Image unselected" : "Image selected") }}}
                          role="button"
                          tabIndex={0}
                          aria-pressed={img.selected}
                          aria-label={`Select image ${globalIndex + 1}`}
                        >
                          <img src={img.url} alt={`Grid image ${globalIndex + 1}`} className="w-full h-full object-cover rounded" />
                          {img.selected && (
                            <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center" aria-hidden="true">
                              <div className="w-3 h-3 bg-primary rounded-sm" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-1 truncate">#{globalIndex + 1}</span>
                        <button
                          onClick={() => { remove(img.id); announceToScreenReader("Image removed") }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded"
                          aria-label={`Remove image ${globalIndex + 1}`}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* USAGE GUIDE */}
            <div className="m-4 rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add images to fill your chosen grid layout. The tool arranges them in order and renders them on a canvas.
                  You can reorder images two ways: <span className="text-foreground font-medium">drag a row</span> in the Images list, or <span className="text-foreground font-medium">drag directly on the preview grid</span> — both work on touchscreen too.
                  Click <span className="text-foreground font-medium">Download PNG</span> to export the current grid.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Layouts</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li><span className="text-foreground font-medium">2x2</span> fills a 2-column, 2-row grid with 4 images.</li>
                  <li><span className="text-foreground font-medium">3x3</span> fills a 3-column, 3-row grid with 9 images.</li>
                  <li><span className="text-foreground font-medium">1x3 row</span> places 3 images side by side in a single row.</li>
                  <li><span className="text-foreground font-medium">3x1 col</span> stacks 3 images in a single column.</li>
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Pages</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If you add more images than the layout requires, they split into pages. Use the Previous and Next buttons to switch pages. Download saves the current page only.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Settings (desktop)</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">Gap</span> sets spacing between images.
                  <span className="text-foreground font-medium"> BG</span> sets the background color visible in gaps and margins.
                  <span className="text-foreground font-medium"> Size</span> controls output PNG resolution (800, 1200, or 2000 px).
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
            </div>

            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>

          {totalPages > 1 && (
            <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between" role="navigation" aria-label="Image pagination">
              <button
                onClick={() => { setCurrentPage(prev => Math.max(0, prev - 1)); announceToScreenReader(`Page ${currentPage} of ${totalPages}`) }}
                disabled={currentPage === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                aria-label="Go to previous page"
              >
                <ChevronLeft className="h-3 w-3" aria-hidden="true" />Previous
              </button>
              <span className="text-xs text-muted-foreground" aria-live="polite">Page {currentPage + 1} of {totalPages}</span>
              <button
                onClick={() => { setCurrentPage(prev => Math.min(totalPages - 1, prev + 1)); announceToScreenReader(`Page ${currentPage + 2} of ${totalPages}`) }}
                disabled={currentPage === totalPages - 1}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                aria-label="Go to next page"
              >
                Next<ChevronRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Output/Preview panel */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`} role="region" aria-labelledby="preview-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium" id="preview-panel-label">Preview</span>
            {currentImages.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {totalPages > 1 && (
                  <>
                    <span aria-live="polite">Page {currentPage + 1} · {currentImages.length} images</span>
                    <span className="w-px h-3 bg-border" aria-hidden="true" />
                  </>
                )}
                <span className="flex items-center gap-1">
                  <Grip className="h-3 w-3" aria-hidden="true" />
                  Drag to reorder
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-muted/10 overflow-hidden" role="img" aria-label={images.length > 0 ? "Image grid preview" : "Empty preview"}>
            {images.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center" role="status">
                <p>Add {needed} images to fill the {layoutDef.cols}×{layoutDef.rows} grid</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain rounded-lg border border-border shadow-lg"
                style={{ maxWidth: "100%", touchAction: "none", cursor: canvasDragging !== null ? "grabbing" : "grab" }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerCancel}
                aria-label={`${layoutDef.cols} by ${layoutDef.rows} image grid preview with ${currentImages.length} images. Drag to reorder.`}
              />
            )}
          </div>
        </div>

      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button
          variant={downloading ? "outline" : "default"}
          size="sm"
          className="h-11 px-4"
          onClick={download}
          disabled={images.length === 0}
          aria-label={downloading ? "Image grid downloaded" : "Download image grid as PNG"}
        >
          {downloading ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
          {downloading ? "Downloaded!" : "Download PNG"}
        </Button>
      </div>

    </div>
  )
}
