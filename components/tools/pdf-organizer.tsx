"use client"

import { useState, useRef } from "react"
import { PDFDocument } from "pdf-lib"
import { Upload, Download, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageInfo { idx: number; thumb: string }

const PDFJS_VERSION = "4.9.155"

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist" as any)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`
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
  const srcBytesRef = useRef<ArrayBuffer | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setPages([]); setFilename(file.name.replace(/\.pdf$/i, ""))
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
    } catch (err) { console.error(err) }
    setLoading(false); setProgress(0)
    e.target.value = ""
  }

  const move = (i: number, dir: -1 | 1) =>
    setPages(prev => {
      if (i + dir < 0 || i + dir >= prev.length) return prev
      const arr = [...prev];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
      return arr
    })

  const remove = (i: number) => setPages(prev => prev.filter((_, j) => j !== i))

  const download = async () => {
    if (!srcBytesRef.current || !pages.length) return
    setLoading(true)
    try {
      const src = await PDFDocument.load(srcBytesRef.current)
      const out = await PDFDocument.create()
      const copied = await out.copyPages(src, pages.map(p => p.idx))
      copied.forEach(p => out.addPage(p))
      const bytes = await out.save()
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
        download: `${filename}-organized.pdf`,
      })
      a.click()
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">PDF Organizer</h1>
            <p className="text-sm text-muted-foreground">Reorder and delete PDF pages. All processing happens in your browser.</p>
          </div>
          <div className="flex gap-2">
            <label>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
              <Button variant="outline" size="sm" asChild>
                <span><Upload className="h-4 w-4 mr-1" />Open PDF</span>
              </Button>
            </label>
            <Button onClick={download} disabled={!pages.length || loading}>
              <Download className="h-4 w-4 mr-1" />{loading ? "Saving..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {pages.length === 0 ? (
          <label className="flex flex-col items-center justify-center h-full cursor-pointer">
            <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <Upload className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">
              {loading ? `Rendering pages… ${progress}%` : "Click to upload a PDF"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Reorder or remove pages, then download</p>
          </label>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <p className="text-sm text-muted-foreground mb-4">{pages.length} pages — use arrows to reorder, ✕ to delete</p>
            <div className="grid grid-cols-4 gap-4">
              {pages.map((page, i) => (
                <div key={`${page.idx}-${i}`} className="group relative rounded-lg border border-border overflow-hidden">
                  <img src={page.thumb} alt={`Page ${i + 1}`} className="w-full" />
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors">
                      <ArrowUp className="h-3 w-3 text-white" />
                    </button>
                    <button onClick={() => remove(i)}
                      className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors">
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === pages.length - 1}
                      className="p-1.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 transition-colors">
                      <ArrowDown className="h-3 w-3 text-white" />
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
  )
}
