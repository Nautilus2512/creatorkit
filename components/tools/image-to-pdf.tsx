"use client"

import { useState } from "react"
import { PDFDocument } from "pdf-lib"
import { Upload, Download, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface ImgFile { id: string; file: File; url: string; name: string }
type PageSize = "fit" | "a4" | "letter"
type Orientation = "portrait" | "landscape"

const PAGE_DIMS: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

async function fileToEmbeddable(pdf: PDFDocument, file: File) {
  const bytes = await file.arrayBuffer()
  if (file.type === "image/jpeg") return pdf.embedJpg(bytes)
  // For PNG / WebP / anything else → canvas → PNG bytes
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0)
  const png = await new Promise<ArrayBuffer>(res =>
    canvas.toBlob(b => b!.arrayBuffer().then(res), "image/png")
  )
  return pdf.embedPng(png)
}

export default function ImageToPdf() {
  const [images, setImages] = useState<ImgFile[]>([])
  const [pageSize, setPageSize] = useState<PageSize>("fit")
  const [orientation, setOrientation] = useState<Orientation>("portrait")
  const [loading, setLoading] = useState(false)

  const add = (files: FileList | null) => {
    if (!files) return
    setImages(prev => [
      ...prev,
      ...Array.from(files)
        .filter(f => f.type.startsWith("image/"))
        .map(f => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), name: f.name })),
    ])
  }

  const remove = (id: string) =>
    setImages(prev => { const img = prev.find(i => i.id === id); if (img) URL.revokeObjectURL(img.url); return prev.filter(i => i.id !== id) })

  const move = (id: string, dir: -1 | 1) =>
    setImages(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx + dir < 0 || idx + dir >= prev.length) return prev
      const arr = [...prev];
      [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]
      return arr
    })

  const convert = async () => {
    if (!images.length) return
    setLoading(true)
    try {
      const pdf = await PDFDocument.create()
      for (const img of images) {
        const embedded = await fileToEmbeddable(pdf, img.file)
        const { width: iw, height: ih } = embedded.scale(1)

        let [pw, ph] = pageSize === "fit" ? [iw, ih] : PAGE_DIMS[pageSize]
        if (orientation === "landscape" && pageSize !== "fit") [pw, ph] = [ph, pw]

        const page = pdf.addPage([pw, ph])
        if (pageSize === "fit") {
          page.drawImage(embedded, { x: 0, y: 0, width: iw, height: ih })
        } else {
          const m = 36
          const maxW = pw - m * 2, maxH = ph - m * 2
          const scale = Math.min(maxW / iw, maxH / ih)
          const dw = iw * scale, dh = ih * scale
          page.drawImage(embedded, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh })
        }
      }
      const bytes = await pdf.save()
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
        download: "images.pdf",
      })
      a.click()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Image to PDF</h1>
            <p className="text-sm text-muted-foreground">Combine images into a PDF document. All processing happens in your browser.</p>
          </div>
          <Button onClick={convert} disabled={!images.length || loading}>
            <Download className="h-4 w-4 mr-1" />{loading ? "Converting..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Options */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-2 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Page size:</Label>
          {(["fit", "a4", "letter"] as PageSize[]).map(v => (
            <button key={v} onClick={() => setPageSize(v)}
              className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${pageSize === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {v === "fit" ? "Fit to image" : v.toUpperCase()}
            </button>
          ))}
        </div>
        {pageSize !== "fit" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Orientation:</Label>
            {(["portrait", "landscape"] as Orientation[]).map(v => (
              <button key={v} onClick={() => setOrientation(v)}
                className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${orientation === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Upload zone */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-56 md:shrink-0">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Images</h3>
          </div>
          <label className="flex-1 flex flex-col items-center justify-center p-4 cursor-pointer border-2 border-dashed border-border m-3 rounded-xl hover:border-primary/50 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
            <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-center">Click or drop images here</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
          </label>
        </div>

        {/* Image list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-medium">{images.length} image{images.length !== 1 ? "s" : ""} · pages in order</h3>
            {images.length > 0 && <Button variant="ghost" size="sm" onClick={() => setImages([])}>Clear all</Button>}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {images.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Add images to get started</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={img.id} className="relative group rounded-lg border border-border overflow-hidden">
                    <img src={img.url} alt={img.name} className="w-full h-28 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button onClick={() => move(img.id, -1)} disabled={i === 0} className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors">
                        <ArrowUp className="h-3 w-3 text-white" />
                      </button>
                      <button onClick={() => remove(img.id)} className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors">
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                      <button onClick={() => move(img.id, 1)} disabled={i === images.length - 1} className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors">
                        <ArrowDown className="h-3 w-3 text-white" />
                      </button>
                    </div>
                    <div className="bg-background/90 px-2 py-1 text-xs truncate border-t border-border">
                      <span className="font-medium">{i + 1}.</span> {img.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
