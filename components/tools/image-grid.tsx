"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Download, Trash2, Grip, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

export default function ImageGrid() {
  const [images, setImages] = useState<GridImage[]>([])
  const [layout, setLayout] = useState<Layout>("2x2")
  const [gap, setGap] = useState(8)
  const [bgColor, setBgColor] = useState("#ffffff")
  const [canvasSize, setCanvasSize] = useState(1200)
  const [currentPage, setCurrentPage] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const add = async (files: FileList | null) => {
    if (!files) return
    const newImgs = await Promise.all(
      Array.from(files).filter(f => f.type.startsWith("image/")).map(async f => {
        const url = URL.createObjectURL(f)
        const img = await loadImage(url)
        return { id: crypto.randomUUID(), url, img }
      })
    )
    setImages(prev => [...prev, ...newImgs])
  }

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

  const download = () => {
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
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (images.length > 0) download()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [images, download])

  return (
    <>
      <ShortcutsModal
        pageName="Image Grid"
        shortcuts={[
          { keys: ["Ctrl", "S"], description: "Download PNG" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Image Grid / Collage</h2>
          <p className="text-muted-foreground">Arrange images in a grid and export as a single PNG.</p>
        </div>
        <Button onClick={download} disabled={images.length === 0}>
          <Download className="h-4 w-4 mr-1" />Download PNG
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground shrink-0">Layout:</Label>
          {LAYOUTS.map(l => (
            <button key={l.key} onClick={() => setLayout(l.key)}
              className={`text-xs px-2 sm:px-3 py-1 rounded-full border transition-colors ${layout === l.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Gap:</Label>
          <Slider value={[gap]} onValueChange={([v]) => setGap(v)} min={0} max={40} step={2} className="w-20 sm:w-24" />
          <span className="text-xs font-mono text-muted-foreground">{gap}px</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">BG:</Label>
          <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-border cursor-pointer p-0.5" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Size:</Label>
          {[800, 1200, 2000].map(s => (
            <button key={s} onClick={() => setCanvasSize(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${canvasSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {s}px
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-visible">
        {/* Left — images */}
        <div className="flex flex-col rounded-xl border border-border bg-card min-h-[250px] lg:min-h-0 lg:overflow-hidden">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Images ({images.length}/{needed})</h3>
            <div className="flex items-center gap-2">
              {images.length > needed && (
                <>
                  <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-primary">Select All</button>
                  <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-primary">Clear</button>
                </>
              )}
              {images.length > 0 && <button onClick={() => setImages([])} className="text-xs text-muted-foreground hover:text-destructive">Clear All</button>}
            </div>
          </div>
          {images.length === 0 ? (
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Click to add images</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
            </label>
          ) : (
            <>
              <label className="shrink-0 flex items-center justify-center gap-2 p-3 cursor-pointer border-b border-border hover:bg-muted/30 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add more images</span>
              </label>
              <p className="text-xs text-muted-foreground text-center py-2 px-4">
                <span className="inline-flex items-center gap-1"><Grip className="h-3 w-3" /> Drag images to reorder</span>
              </p>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[40vh] lg:max-h-none">
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
                  className={`flex items-center gap-2 p-1.5 rounded border transition-all cursor-move ${
                    img.selected ? "border-primary bg-primary/5" : "border-border"
                  } ${
                    dragOverIndex === globalIndex ? "border-primary bg-primary/10" : ""
                  } group`}
                >
                  <Grip className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div 
                    className="w-10 h-10 object-cover rounded shrink-0 relative"
                    onClick={() => toggleSelection(img.id)}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover rounded" />
                    {img.selected && (
                      <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                        <div className="w-3 h-3 bg-primary rounded-sm" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-1 truncate">#{globalIndex + 1}</span>
                  <button 
                    onClick={() => remove(img.id)} 
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right — Preview */}
        <div className="flex flex-col rounded-xl border border-border bg-card min-h-[300px] lg:min-h-0 lg:overflow-hidden">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            {totalPages > 1 && (
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} · {currentImages.length} images
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-muted/10 overflow-hidden min-h-[250px]">
            {images.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center">
                <p>Add {needed} images to fill the {layoutDef.cols}×{layoutDef.rows} grid</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[50vh] lg:max-h-full object-contain rounded-lg border border-border shadow-lg"
                style={{ maxWidth: "100%" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
