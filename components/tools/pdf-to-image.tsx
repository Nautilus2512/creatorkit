"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"
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
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const pdfDocRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setPreviews([]); setFilename(file.name.replace(/\.pdf$/i, ""))
    announceToScreenReader(`Loading ${file.name}...`)
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
      announceToScreenReader(`PDF loaded with ${result.length} pages`)
      setActiveTab("output")
    } catch (err) {
      console.error(err)
      announceToScreenReader("Error loading PDF")
    }
    setLoading(false); setProgress(0)
    e.target.value = ""
  }

  const downloadOne = useCallback(async (pageIdx: number) => {
    if (!pdfDocRef.current) return
    const url = await renderPage(pdfDocRef.current, pageIdx + 1, scale)
    const a = Object.assign(document.createElement("a"), {
      href: url, download: `${filename}-page-${pageIdx + 1}.png`,
    })
    a.click()
    announceToScreenReader(`Downloaded page ${pageIdx + 1}`)
  }, [scale, filename, announceToScreenReader])

  const downloadAll = useCallback(async () => {
    if (!pdfDocRef.current) return
    setLoading(true)
    announceToScreenReader("Creating ZIP file...")
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
    announceToScreenReader("All images downloaded as ZIP")
  }, [scale, filename, announceToScreenReader])

  const openFileDialog = () => {
    fileInputRef.current?.click()
    announceToScreenReader("File picker opened")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        openFileDialog()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d" && previews.length > 0) {
        e.preventDefault()
        downloadAll()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [downloadAll, previews.length])

  return (
    <div className="flex h-full flex-col">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">PDF to Image</span>
        <div className="flex items-center gap-3" role="group" aria-label="Export resolution settings">
          <Label className="text-xs text-muted-foreground" htmlFor="scale-slider">Export resolution:</Label>
          <Slider
            id="scale-slider"
            value={[scale]}
            onValueChange={([v]) => { setScale(v); announceToScreenReader(`Resolution set to ${v}×`) }}
            min={0.5}
            max={3}
            step={0.5}
            className="w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Export resolution: ${scale}×`}
          />
          <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{scale}× ({Math.round(scale * 96)} DPI equiv.)</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="PDF to Image"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Open PDF file" },
              { keys: ["Ctrl", "Shift", "D"], description: "Download all images as ZIP" },
            ]}
          />
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
                <kbd className="ml-2 hidden md:inline rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+O</kbd>
              </span>
            </Button>
          </label>
          {previews.length > 0 && (
            <Button
              size="sm"
              onClick={downloadAll}
              disabled={loading}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={loading ? `Creating ZIP file, ${progress}%` : "Download all images as ZIP"}
            >
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
              {loading ? `${progress}%` : "Download All (ZIP)"}
              <kbd className="ml-2 hidden md:inline rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">PDF to Image</h2>
          <ShortcutsModal
            pageName="PDF to Image"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Open PDF file" },
              { keys: ["Ctrl", "Shift", "D"], description: "Download all images as ZIP" },
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
            Images
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left panel — Upload */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Upload PDF">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Upload PDF</span>
          </div>
          <label
            className="flex-1 flex flex-col items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            onClick={openFileDialog}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFileDialog() }}
            role="button"
            tabIndex={0}
            aria-label={loading ? `Rendering pages… ${progress}%` : "Click to upload a PDF"}
          >
            <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <Upload className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium">{loading ? `Rendering pages… ${progress}%` : "Click to upload a PDF"}</p>
            <p className="text-xs text-muted-foreground mt-1">Each page will be exported as a PNG</p>
          </label>
        </div>

        {/* Right panel — Images grid */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="PDF pages">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">{previews.length > 0 ? `${previews.length} pages` : "Pages"}</span>
          </div>
          {previews.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground p-6 text-center" role="status">
              Upload a PDF to see the pages here
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-4" role="list" aria-label="PDF pages">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="group relative rounded-lg border border-border overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                    role="listitem"
                    aria-label={`Page ${i + 1}`}
                    onClick={() => downloadOne(i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") downloadOne(i) }}
                    tabIndex={0}
                  >
                    <img src={src} alt={`Page ${i + 1}`} className="w-full" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label={`Download page ${i + 1}`}
                      >
                        <FileDown className="h-4 w-4 mr-1" aria-hidden="true" />Page {i + 1}
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

      {/* Mobile bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        {previews.length > 0 ? (
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={downloadAll}
            disabled={loading}
            aria-label={loading ? `Creating ZIP file, ${progress}%` : "Download all images as ZIP"}
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />
            {loading ? `${progress}%` : "Download All (ZIP)"}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={openFileDialog}
            aria-label="Open PDF file"
          >
            <Upload className="h-4 w-4 mr-1" aria-hidden="true" />
            Open PDF
          </Button>
        )}
      </div>
    </div>
  )
}
