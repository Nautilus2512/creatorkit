"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Download, Trash2, Grip, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

interface GridImage { id: string; url: string; img: HTMLImageElement; selected?: boolean }

type Layout = "2x2" | "3x3" | "1x3" | "3x1" | "1+2" | "2+1"

const LAYOUTS: { key: Layout; label: string; cols: number; rows: number; areas?: string }[] = [
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

function drawGrid(canvas: HTMLCanvasElement, images: GridImage[], cols: number, rows: number, gap: number, bg: string) {
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
      // cover fit
      const scale = Math.max(cellW / img.width, cellH / img.height)
      const sw = cellW / scale, sh = cellH / scale
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH)
      i++
    }
  }
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "O"], description: "Upload images" },
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
  const [downloaded, setDownloaded] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (newImgs.length > 0) {
      announceToScreenReader(`${newImgs.length} image${newImgs.length > 1 ? "s" : ""} added`)
    }
  }, [])

  const remove = (id: string) =>
    setImages(prev => { const img = prev.find(i => i.id === id); if (img) URL.revokeObjectURL(img.url); return prev.filter(i => i.id !== id) })

  const toggleSelection = (id: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, selected: !img.selected } : img
    ))
  }

  const selectAll = () => {
    const layoutDef = LAYOUTS.find(l => l.key === layout) || LAYOUTS[0]
    const needed = layoutDef.cols * layoutDef.rows
    setImages(prev => prev.slice(0, needed).map(img => ({ ...img, selected: true })))
  }

  const clearSelection = () => {
    setImages(prev => prev.map(img => ({ ...img, selected: false })))
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (index: number) => {
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    setImages(prev => {
      const newImages = [...prev]
      const draggedItem = newImages[draggedIndex]
      newImages.splice(draggedIndex, 1)
      newImages.splice(dropIndex, 0, draggedItem)
      return newImages
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

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
    drawGrid(canvas, currentImages, layoutDef.cols, layoutDef.rows, gap, bgColor)
  }, [currentImages, layout, gap, bgColor, canvasSize, currentPage])

  const download = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Use selected images if any are selected, otherwise use current page images
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
    setDownloaded(true)
    setActiveTab("output")
    setTimeout(() => setDownloaded(false), 2000)
  }, [images, currentImages, canvasSize, layoutDef, gap, bgColor])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("Upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        if (images.length > 0) {
          download()
          announceToScreenReader("Image grid downloaded")
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [images, download])

  return (
    <>
      <div className="flex flex-1 flex-col min-h-0">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Image Grid controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Image Grid / Collage</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          {/* Layout selector */}
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
          {/* Gap */}
          <div className="flex items-center gap-1.5" role="group" aria-labelledby="gap-label-desktop">
            <span className="text-xs text-muted-foreground" id="gap-label-desktop">Gap:</span>
            <Slider
              value={[gap]}
              onValueChange={([v]) => { setGap(v); announceToScreenReader(`${v} pixel gap`) }}
              min={0}
              max={40}
              step={2}
              className="w-20"
              aria-label={`Gap ${gap} pixels`}
            />
            <span className="text-xs font-mono text-muted-foreground w-8" aria-live="polite">{gap}px</span>
          </div>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          {/* BG color */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">BG:</span>
            <input
              type="color"
              value={bgColor}
              onChange={e => { setBgColor(e.target.value); announceToScreenReader(`Background color changed`) }}
              className="w-6 h-6 rounded border border-border cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Background color ${bgColor}`}
            />
          </div>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          {/* Canvas size */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Size:</span>
            {[800, 1200, 2000].map(s => (
              <button
                key={s}
                onClick={() => { setCanvasSize(s); announceToScreenReader(`${s} pixel canvas size selected`) }}
                aria-pressed={canvasSize === s}
                aria-label={`${s} pixel canvas size`}
                className={`text-xs px-2 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${canvasSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
              >
                {s}px
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Image Grid" shortcuts={shortcuts} />
            <Button
              size="sm"
              onClick={download}
              disabled={images.length === 0}
              aria-label={downloaded ? "Image grid downloaded" : "Download image grid as PNG"}
            >
              {downloaded ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
              {downloaded ? "Downloaded!" : "Download PNG"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Image Grid / Collage</h2>
            <ShortcutsModal pageName="Image Grid" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button
              role="tab"
              aria-selected={activeTab === "input"}
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              Images
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "output"}
              onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel — images */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`} role="region" aria-labelledby="images-panel-label">
            {/* Mobile settings strip */}
            <div className="flex md:hidden flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-1.5" role="group">
                <span className="text-xs text-muted-foreground">Layout:</span>
                {LAYOUTS.map(l => (
                  <button
                    key={l.key}
                    onClick={() => { setLayout(l.key); announceToScreenReader(`${l.label} layout selected`) }}
                    aria-pressed={layout === l.key}
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
                <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2" style={{ minHeight: "200px" }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => add(e.target.files)}
                    ref={fileInputRef}
                    aria-label="Upload images for grid"
                  />
                  <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
                  <p className="text-sm font-medium">Click to add images</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
                  <p className="text-xs text-muted-foreground mt-2">or press Ctrl+Shift+O</p>
                </label>
              ) : (
                <>
                  <label className="flex items-center justify-center gap-2 p-3 cursor-pointer border-b border-border hover:bg-muted/30 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => add(e.target.files)}
                      aria-label="Add more images"
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">Add more images</span>
                  </label>
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
                          } ${
                            dragOverIndex === globalIndex ? "border-primary bg-primary/10" : ""
                          } group`}
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
            </div>

            {totalPages > 1 && (
              <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between" role="navigation" aria-label="Image pagination">
                <button
                  onClick={() => { setCurrentPage(prev => Math.max(0, prev - 1)); announceToScreenReader(`Page ${currentPage} of ${totalPages}`) }}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                  Previous
                </button>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => { setCurrentPage(prev => Math.min(totalPages - 1, prev + 1)); announceToScreenReader(`Page ${currentPage + 2} of ${totalPages}`) }}
                  disabled={currentPage === totalPages - 1}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Output/Preview panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`} role="region" aria-labelledby="preview-panel-label">
            <div className="shrink-0 border-b border-border px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium" id="preview-panel-label">Preview</span>
              {totalPages > 1 && (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  Page {currentPage + 1} · {currentImages.length} images
                </span>
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
                  style={{ maxWidth: "100%" }}
                  aria-label={`${layoutDef.cols} by ${layoutDef.rows} image grid preview with ${currentImages.length} images`}
                />
              )}
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={download}
            disabled={images.length === 0}
            aria-label={downloaded ? "Image grid downloaded" : "Download image grid as PNG"}
          >
            {downloaded ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
            {downloaded ? "Downloaded!" : "Download PNG"}
          </Button>
        </div>

      </div>
    </>
  )
}
