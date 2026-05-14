"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { PDFDocument } from "pdf-lib"
import { Upload, Download, Trash2, ArrowUp, ArrowDown, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  const [downloaded, setDownloaded] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const add = useCallback((files: FileList | null) => {
    if (!files) return
    const newImages = Array.from(files)
      .filter(f => f.type.startsWith("image/"))
      .map(f => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), name: f.name }))
    setImages(prev => [...prev, ...newImages])
    if (newImages.length > 0) {
      announceToScreenReader(`${newImages.length} image${newImages.length > 1 ? "s" : ""} added`)
    }
  }, [])

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

  const convert = useCallback(async () => {
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
        href: URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })),
        download: "images.pdf",
      })
      a.click()
      setDownloaded(true)
      announceToScreenReader("PDF created and downloaded")
      setTimeout(() => setDownloaded(false), 2000)
    } finally {
      setLoading(false)
    }
  }, [images, pageSize, orientation])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("Upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        if (images.length > 0 && !loading) convert()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [images, loading, convert])

  return (
    <div className="flex h-full flex-col" role="main" aria-label="Image to PDF tool">
      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Image to PDF</span>
        <div className="flex items-center gap-4 flex-wrap" role="group" aria-label="PDF settings">
          <div className="flex items-center gap-2" role="group" aria-labelledby="page-size-label">
            <Label className="text-xs text-muted-foreground" id="page-size-label">Page size:</Label>
            {(["fit", "a4", "letter"] as PageSize[]).map(v => (
              <button
                key={v}
                onClick={() => { setPageSize(v); announceToScreenReader(v === "fit" ? "Fit to image selected" : `${v.toUpperCase()} selected`) }}
                aria-pressed={pageSize === v}
                aria-label={v === "fit" ? "Fit to image" : `${v.toUpperCase()} page size`}
                className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${pageSize === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {v === "fit" ? "Fit to image" : v.toUpperCase()}
              </button>
            ))}
          </div>
          {pageSize !== "fit" && (
            <div className="flex items-center gap-2" role="group" aria-labelledby="orientation-label">
              <Label className="text-xs text-muted-foreground" id="orientation-label">Orientation:</Label>
              {(["portrait", "landscape"] as Orientation[]).map(v => (
                <button
                  key={v}
                  onClick={() => { setOrientation(v); announceToScreenReader(`${v} orientation selected`) }}
                  aria-pressed={orientation === v}
                  aria-label={`${v} orientation`}
                  className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${orientation === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Image to PDF"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Upload images" },
              { keys: ["Ctrl", "Shift", "P"], description: "Create PDF" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
          <Button
            size="sm"
            onClick={() => convert()}
            disabled={!images.length || loading}
            aria-label={downloaded ? "PDF created and downloaded" : loading ? "Converting images to PDF" : "Create and download PDF"}
          >
            {downloaded ? <FileDown className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            {downloaded ? "Downloaded!" : loading ? "Converting..." : "Generate PDF"}
            {images.length > 0 && !loading && !downloaded && (
              <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] opacity-60" aria-hidden="true">
                Ctrl+Shift+P
              </kbd>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Image to PDF</h2>
          <ShortcutsModal
            pageName="Image to PDF"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Upload images" },
              { keys: ["Ctrl", "Shift", "P"], description: "Create PDF" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
        </div>
        <div className="flex" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left panel — Upload zone */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="upload-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="upload-panel-label">Add Images</span>
          </div>
          <div className="flex-1 flex flex-col p-4">
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => add(e.target.files)}
                ref={fileInputRef}
                aria-label="Upload images for PDF conversion"
              />
              <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" aria-hidden="true" />
              <p className="text-xs font-medium text-center">Click or drop images here</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
              <p className="text-xs text-muted-foreground mt-2">or press Ctrl+Shift+O</p>
            </label>
          </div>
        </div>

        {/* Right panel — Image list */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="images-list-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium" id="images-list-label">{images.length} image{images.length !== 1 ? "s" : ""} · pages in order</h3>
            {images.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setImages([]); announceToScreenReader("All images cleared") }}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                aria-label="Clear all images"
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4" role="list" aria-label="Image pages">
            {images.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="status">Add images to get started</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                    role="listitem"
                    aria-label={`Page ${i + 1}: ${img.name}`}
                  >
                    <img src={img.url} alt={`Page ${i + 1}: ${img.name}`} className="w-full h-28 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1.5" aria-hidden="true">
                      <button
                        onClick={() => { move(img.id, -1); announceToScreenReader(`Page ${i} moved up`) }}
                        disabled={i === 0}
                        className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                        aria-label="Move page up"
                      >
                        <ArrowUp className="h-3 w-3 text-white" />
                      </button>
                      <button
                        onClick={() => { remove(img.id); announceToScreenReader(`${img.name} removed`) }}
                        className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                        aria-label={`Remove ${img.name}`}
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                      <button
                        onClick={() => { move(img.id, 1); announceToScreenReader(`Page ${i + 2} moved down`) }}
                        disabled={i === images.length - 1}
                        className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                        aria-label="Move page down"
                      >
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

      {/* Mobile bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-11 px-4"
          onClick={() => convert()}
          disabled={!images.length || loading}
          aria-label={downloaded ? "PDF created and downloaded" : loading ? "Converting images to PDF" : "Create and download PDF"}
        >
          {downloaded ? <FileDown className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" />}
          {downloaded ? "Downloaded!" : loading ? "Converting..." : "Generate PDF"}
        </Button>
      </div>
    </div>
  )
}
