"use client"

import { useState, useRef } from "react"
import { Upload, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import JSZip from "jszip"

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist" as any)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

async function renderPage(pdfDoc: any, pageNum: number, scale: number): Promise<string> {
  const page = await pdfDoc.getPage(pageNum)
  const vp = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = vp.width; canvas.height = vp.height
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise
  return canvas.toDataURL("image/png")
}

export default function PdfToImage() {
  const [previews, setPreviews] = useState<string[]>([])
  const [filename, setFilename] = useState("")
  const [scale, setScale] = useState(1.5)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pdfDocRef = useRef<any>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setPreviews([]); setFilename(file.name.replace(/\.pdf$/i, ""))
    try {
      const pdfjs = await loadPdfJs()
      const buf = await file.arrayBuffer()
      const doc = await pdfjs.getDocument(buf).promise
      pdfDocRef.current = doc
      const result: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        result.push(await renderPage(doc, i, 0.5))
        setProgress(Math.round((i / doc.numPages) * 100))
      }
      setPreviews(result)
    } catch (err) { console.error(err) }
    setLoading(false); setProgress(0)
    e.target.value = ""
  }

  const downloadOne = async (pageIdx: number) => {
    if (!pdfDocRef.current) return
    const url = await renderPage(pdfDocRef.current, pageIdx + 1, scale)
    const a = Object.assign(document.createElement("a"), {
      href: url, download: `${filename}-page-${pageIdx + 1}.png`,
    })
    a.click()
  }

  const downloadAll = async () => {
    if (!pdfDocRef.current) return
    setLoading(true)
    const zip = new JSZip()
    const doc = pdfDocRef.current
    for (let i = 1; i <= doc.numPages; i++) {
      const url = await renderPage(doc, i, scale)
      zip.file(`${filename}-page-${i}.png`, url.split(",")[1], { base64: true })
      setProgress(Math.round((i / doc.numPages) * 100))
    }
    const blob = await zip.generateAsync({ type: "blob" })
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: `${filename}-images.zip`,
    })
    a.click()
    setLoading(false); setProgress(0)
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">PDF to Image</h2>
          <p className="text-muted-foreground">Convert PDF pages to PNG images. All processing happens in your browser.</p>
        </div>
        <div className="flex gap-2">
          <label>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-1" />Open PDF</span></Button>
          </label>
          {previews.length > 0 && (
            <Button size="sm" onClick={downloadAll} disabled={loading}>
              <Download className="h-4 w-4 mr-1" />{loading ? `${progress}%` : "Download All (ZIP)"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Label className="text-xs text-muted-foreground">Export resolution:</Label>
        <Slider value={[scale]} onValueChange={([v]) => setScale(v)} min={0.5} max={3} step={0.5} className="w-28" />
        <span className="text-xs font-mono text-muted-foreground">{scale}× ({Math.round(scale * 96)} DPI equiv.)</span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card">
        {previews.length === 0 ? (
          <label className="flex flex-col items-center justify-center h-full cursor-pointer">
            <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <Upload className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{loading ? `Rendering pages… ${progress}%` : "Click to upload a PDF"}</p>
            <p className="text-xs text-muted-foreground mt-1">Each page will be exported as a PNG</p>
          </label>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <div className="grid grid-cols-3 gap-4">
              {previews.map((src, i) => (
                <div key={i} className="group relative rounded-lg border border-border overflow-hidden cursor-pointer" onClick={() => downloadOne(i)}>
                  <img src={src} alt={`Page ${i + 1}`} className="w-full" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary">
                      <FileDown className="h-4 w-4 mr-1" />Page {i + 1}
                    </Button>
                  </div>
                  <div className="bg-background px-2 py-1 text-xs text-center font-mono border-t border-border">Page {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
