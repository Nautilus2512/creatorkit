"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface GridImage { id: string; url: string; img: HTMLImageElement }

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

  const layoutDef = LAYOUTS.find(l => l.key === layout) || LAYOUTS[0]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || images.length === 0) return
    canvas.width = canvasSize
    canvas.height = canvasSize
    drawGrid(canvas, images, layoutDef.cols, layoutDef.rows, gap, bgColor)
  }, [images, layout, gap, bgColor, canvasSize])

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = Object.assign(document.createElement("a"), {
      href: canvas.toDataURL("image/png"), download: "image-grid.png",
    })
    a.click()
  }

  const needed = layoutDef.cols * layoutDef.rows

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Image Grid / Collage</h1>
            <p className="text-sm text-muted-foreground">Arrange images in a grid and export as a single PNG.</p>
          </div>
          <Button onClick={download} disabled={images.length === 0}>
            <Download className="h-4 w-4 mr-1" />Download PNG
          </Button>
        </div>
      </div>

      {/* Options */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-2 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Layout:</Label>
          {LAYOUTS.map(l => (
            <button key={l.key} onClick={() => setLayout(l.key)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${layout === l.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Gap:</Label>
          <Slider value={[gap]} onValueChange={([v]) => setGap(v)} min={0} max={40} step={2} className="w-24" />
          <span className="text-xs font-mono text-muted-foreground">{gap}px</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">BG:</Label>
          <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer p-0.5" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Size:</Label>
          {[800, 1200, 2000].map(s => (
            <button key={s} onClick={() => setCanvasSize(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${canvasSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {s}px
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — images */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-56 md:shrink-0">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-medium">Images ({images.length}/{needed})</h3>
            {images.length > 0 && <button onClick={() => setImages([])} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>}
          </div>
          <label className="shrink-0 flex items-center justify-center gap-2 p-3 cursor-pointer border-b border-border hover:bg-muted/30 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add images</span>
          </label>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {images.map((img, i) => (
              <div key={img.id} className="flex items-center gap-2 p-1.5 rounded border border-border group">
                <img src={img.url} alt="" className="w-10 h-10 object-cover rounded shrink-0" />
                <span className="text-xs text-muted-foreground flex-1 truncate">#{i + 1}</span>
                <button onClick={() => remove(img.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/10 overflow-hidden">
          {images.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center">
              <p>Add {needed} images to fill the {layoutDef.cols}×{layoutDef.rows} grid</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain rounded-lg border border-border shadow-lg"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
