"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { PDFDocument } from "pdf-lib"
import { Upload, Download, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface PageInfo { idx: number; thumb: string }

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist" as any)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

async function renderThumb(pdfDoc: any, pageNum: number, scale = 0.35): Promise<string> {
  const page = await pdfDoc.getPage(pageNum)
  const vp = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = vp.width; canvas.height = vp.height
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise
  return canvas.toDataURL("image/jpeg", 0.65)
}

export default function PdfOrganizer() {
  const [pages, setPages] = useState<PageInfo[]>([])
  const [filename, setFilename] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const srcBytesRef = useRef<ArrayBuffer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setPages([]); setFilename(file.name.replace(/\.pdf$/i, ""))
    announceToScreenReader(`Loading ${file.name}...`)
    try {
      const buf = await file.arrayBuffer()
      srcBytesRef.current = buf
      const pdfjs = await loadPdfJs()
      const doc = await pdfjs.getDocument(buf.slice(0)).promise
      const result: PageInfo[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        result.push({ idx: i - 1, thumb: await renderThumb(doc, i) })
        setProgress(Math.round((i / doc.numPages) * 100))
      }
      setPages(result)
      announceToScreenReader(`PDF loaded with ${result.length} pages`)
    } catch (err) { 
      console.error(err) 
      announceToScreenReader("Error loading PDF")
    }
    setLoading(false); setProgress(0)
    e.target.value = ""
  }

  const move = (i: number, dir: -1 | 1) =>
    setPages(prev => {
      if (i + dir < 0 || i + dir >= prev.length) return prev
      const arr = [...prev];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
      const movedPage = dir === -1 ? i : i + 1
      announceToScreenReader(`Page ${movedPage + 1} moved ${dir === -1 ? 'up' : 'down'}`)
      return arr
    })

  const remove = (i: number) => {
    const removedPage = i + 1
    setPages(prev => prev.filter((_, j) => j !== i))
    announceToScreenReader(`Page ${removedPage} removed`)
  }

  const download = useCallback(async () => {
    if (!srcBytesRef.current || !pages.length) return
    setLoading(true)
    announceToScreenReader("Saving PDF...")
    try {
      const src = await PDFDocument.load(srcBytesRef.current)
      const out = await PDFDocument.create()
      const copied = await out.copyPages(src, pages.map(p => p.idx))
      copied.forEach(p => out.addPage(p))
      const bytes = await out.save()
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })),
        download: `${filename}-organized.pdf`,
      })
      a.click()
      announceToScreenReader("PDF downloaded")
    } finally { setLoading(false) }
  }, [pages, filename, announceToScreenReader])

  const openFileDialog = () => {
    fileInputRef.current?.click()
    announceToScreenReader("File picker opened")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
        download()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        openFileDialog()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [download])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <ShortcutsModal
        pageName="PDF Organizer"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "O"], description: "Open PDF file" },
          { keys: ["Ctrl", "Shift", "D"], description: "Download organized PDF" },
        ]}
      />
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">PDF Organizer</h2>
            <p className="text-muted-foreground">Reorder and delete PDF pages. All processing happens in your browser.</p>
          </div>
          <div className="flex gap-2" role="group" aria-label="File actions">
            <label>
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFile} 
                ref={fileInputRef}
                aria-label="Select PDF file"
              />
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span 
                  className="cursor-pointer" 
                  onClick={openFileDialog}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFileDialog() }}
                  aria-label="Open PDF file"
                >
                  <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Open PDF
                  <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+O</kbd>
                </span>
              </Button>
            </label>
            <Button 
              onClick={download} 
              disabled={!pages.length || loading}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={loading ? "Saving PDF" : "Download organized PDF"}
            >
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
              {loading ? "Saving..." : "Download PDF"}
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="PDF pages">
          {pages.length === 0 ? (
            <label 
              className="flex flex-col items-center justify-center h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              onClick={openFileDialog}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFileDialog() }}
              role="button"
              tabIndex={0}
              aria-label={loading ? `Rendering pages… ${progress}%` : "Click to upload a PDF"}
            >
              <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
              <Upload className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">
                {loading ? `Rendering pages… ${progress}%` : "Click to upload a PDF"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Reorder or remove pages, then download</p>
            </label>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <p className="text-sm text-muted-foreground mb-4" role="status" aria-live="polite">{pages.length} pages — use arrows to reorder, delete button to remove</p>
              <div className="grid grid-cols-4 gap-4" role="list" aria-label="PDF pages">
                {pages.map((page, i) => (
                  <div 
                    key={`${page.idx}-${i}`} 
                    className="group relative rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                    role="listitem"
                    aria-label={`Page ${i + 1}, original page ${page.idx + 1}`}
                  >
                    <img src={page.thumb} alt={`Page ${i + 1}`} className="w-full" />
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2" role="group" aria-label="Page actions">
                      <button 
                        onClick={() => move(i, -1)} 
                        disabled={i === 0}
                        className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                        aria-label={`Move page ${i + 1} up`}
                      >
                        <ArrowUp className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                      <button 
                        onClick={() => remove(i)}
                        className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                        aria-label={`Delete page ${i + 1}`}
                      >
                        <Trash2 className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                      <button 
                        onClick={() => move(i, 1)} 
                        disabled={i === pages.length - 1}
                        className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                        aria-label={`Move page ${i + 1} down`}
                      >
                        <ArrowDown className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="bg-background px-2 py-1 text-xs text-center border-t border-border">
                      <span className="font-medium">p.{i + 1}</span>
                      <span className="text-muted-foreground ml-1">(orig. {page.idx + 1})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
