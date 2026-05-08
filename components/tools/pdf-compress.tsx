"use client"

import { useState, useRef } from "react"
import { FileDown, Upload, X, Download, AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { PDFDocument } from 'pdf-lib'

// Change from static import to dynamic
let pdfjsLib: typeof import('pdfjs-dist') | null = null

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

interface CompressionOptions {
  quality: number
  maxDimension: number
  targetDPI: number
}

interface CompressionResult {
  originalSize: number
  compressedSize: number
  pagesProcessed: number
  compressionRatio: number
  blob: Blob
}

class PDFCompressor {
  private options: CompressionOptions
  private onProgress: (progress: number) => void

  constructor(
    options: Partial<CompressionOptions> = {},
    onProgress: (progress: number) => void = () => {}
  ) {
    this.options = {
      quality: 0.65,
      maxDimension: 1500,
      targetDPI: 150,
      ...options
    }
    this.onProgress = onProgress
  }

  private async setupPDFJS(): Promise<typeof import('pdfjs-dist')> {
    if (typeof window === 'undefined') throw new Error('PDF.js only works in browser')
    
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    }
    
    return pdfjsLib
  }

  async compress(file: File): Promise<CompressionResult> {
    const pdfjs = await this.setupPDFJS()
    const originalSize = file.size
    const arrayBuffer = await file.arrayBuffer()
    
    const [pdfDoc, pdfjsDoc] = await Promise.all([
      PDFDocument.load(arrayBuffer),
      pdfjs.getDocument({ data: arrayBuffer }).promise
    ])

    const pageCount = pdfDoc.getPageCount()
    const newPdf = await PDFDocument.create()

    const batchSize = 2
    for (let i = 0; i < pageCount; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, pageCount)
      
      for (let pageNum = i; pageNum < batchEnd; pageNum++) {
        this.onProgress((pageNum / pageCount) * 100)

        try {
          const pdfjsPage = await pdfjsDoc.getPage(pageNum + 1)
          const viewport = pdfjsPage.getViewport({ scale: 1 })
          
          const scale = this.calculateScale(viewport.width, viewport.height)
          const scaledViewport = pdfjsPage.getViewport({ scale })

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { alpha: false })
          if (!ctx) throw new Error('Canvas not supported')

          canvas.width = scaledViewport.width
          canvas.height = scaledViewport.height
          
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // @ts-ignore
          await pdfjsPage.render({
            canvasContext: ctx,
            viewport: scaledViewport,
            canvas: canvas
          }).promise

          const compressedImageData = await this.canvasToJpeg(canvas)
          const embeddedImage = await newPdf.embedJpg(compressedImageData)

          const newPage = newPdf.addPage([viewport.width, viewport.height])
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height
          })

          pdfjsPage.cleanup()
          canvas.width = 0
          canvas.height = 0
          
        } catch (err) {
          console.warn(`Failed to compress page ${pageNum + 1}:`, err)
          const [fallbackPage] = await newPdf.copyPages(pdfDoc, [pageNum])
          newPdf.addPage(fallbackPage)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const compressedBytes = await newPdf.save({
      useObjectStreams: true,
      addDefaultPage: false
    })

    // @ts-ignore
    const blob = new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' })
    const compressedSize = blob.size
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100)

    return {
      originalSize,
      compressedSize,
      pagesProcessed: pageCount,
      compressionRatio,
      blob
    }
  }

  private calculateScale(width: number, height: number): number {
    const maxDim = Math.max(width, height)
    if (maxDim <= this.options.maxDimension) return 1
    return this.options.maxDimension / maxDim
  }

  private async canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to blob failed'))
            return
          }
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer))
          }
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        },
        'image/jpeg',
        this.options.quality
      )
    })
  }
}

export function PDFCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [options, setOptions] = useState<CompressionOptions>({
    quality: 0.65,
    maxDimension: 1500,
    targetDPI: 150
  })
  const [removeMetadata, setRemoveMetadata] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file")
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleCompress = async () => {
    if (!file) return
    setCompressing(true)
    setError(null)
    setProgress(0)

    try {
      const compressor = new PDFCompressor(options, setProgress)
      const compressionResult = await compressor.compress(file)
      setResult(compressionResult)
    } catch (err) {
      setError("Could not compress this PDF. It may be encrypted or contain unsupported features.")
    } finally {
      setCompressing(false)
    }
  }

  const download = () => {
    if (!result?.blob) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file?.name.replace(/\.pdf$/i, `-compressed-${Math.round(options.quality * 100)}.pdf`) || "compressed.pdf"
    a.click()
    URL.revokeObjectURL(url)
  }

  const openFileDialog = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <>
    <ShortcutsModal
      pageName="PDF Compressor (Scanned Docs)"
      shortcuts={[
        { keys: ["Ctrl", "Enter"], description: "Compress PDF" },
        { keys: ["Ctrl", "O"], description: "Open file picker" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">PDF Compressor (Scanned Docs)</h2>
        <p className="text-muted-foreground">Best for scanned/image-heavy PDFs · Renders to JPEG · 100% in-browser</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
      {/* Left panel */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="space-y-2">
            <Label className="text-sm font-medium">PDF File</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={openFileDialog}
              className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0">
                    <FileDown className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm font-medium">Drop a PDF here</p>
                  <p className="text-xs text-muted-foreground">PDF only · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+O</kbd></p>
                </div>
              )}
            </div>
          </div>

          {/* Compression Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Compression Settings
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Simple' : 'Advanced'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Compression Quality</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'High', value: 0.5, desc: 'Smallest file' },
                    { label: 'Medium', value: 0.65, desc: 'Balanced' },
                    { label: 'Good', value: 0.8, desc: 'Better quality' },
                    { label: 'Best', value: 0.95, desc: 'Near original' },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setOptions({...options, quality: preset.value})}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        options.quality === preset.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium">{preset.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-2">
                  <p className="font-medium text-blue-700 dark:text-blue-300">How this works:</p>
                  <ul className="space-y-1 text-blue-600 dark:text-blue-400 list-disc list-inside">
                    <li>Each PDF page is rendered to an image using your browser</li>
                    <li>Images are compressed with JPEG at your selected quality level</li>
                    <li>A new PDF is built from these compressed images</li>
                    <li>Text becomes images (unselectable), but size drops 60-80%</li>
                  </ul>
                  <p className="text-blue-500 dark:text-blue-400 italic pt-1">Best for: scanned documents, image-heavy PDFs, reducing email attachment sizes</p>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs space-y-2">
                  <p className="font-medium text-amber-700 dark:text-amber-300">Limitations & Requirements:</p>
                  <ul className="space-y-1 text-amber-600 dark:text-amber-400 list-disc list-inside">
                    <li>Max file size: ~50MB (browser memory limit)</li>
                    <li>Password-protected PDFs cannot be processed</li>
                    <li>Complex PDFs with forms or scripts may fail</li>
                    <li>Processing happens entirely in your browser - no server upload</li>
                  </ul>
                  <p className="text-amber-500 dark:text-amber-400 italic pt-1">v1.0 - Client-side only • Free • Open source</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Max Resolution</Label>
                <select
                  value={options.maxDimension}
                  onChange={(e) => setOptions({...options, maxDimension: Number(e.target.value)})}
                  className="w-full p-2 border rounded-md bg-background text-sm"
                >
                  <option value={2000}>High (2000px)</option>
                  <option value={1500}>Medium (1500px)</option>
                  <option value={1200}>Standard (1200px)</option>
                  <option value={1000}>Low (1000px)</option>
                  <option value={800}>Very Low (800px)</option>
                </select>
              </div>
            </div>

            {showAdvanced && (
              <div className="space-y-3 bg-muted/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="remove-metadata" className="text-sm">Remove Metadata</Label>
                  <Switch id="remove-metadata" checked={removeMetadata} onCheckedChange={setRemoveMetadata} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: This tool renders each page to an image and re-encodes it. Text will become unselectable, but file size can be reduced by 60-80% for scanned documents.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          {progress > 0 && progress < 100 && (
            <div className="mb-3">
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground">{Math.round(progress)}% processed</p>
            </div>
          )}
          <Button className="w-full" onClick={handleCompress} disabled={!file || compressing}>
            {compressing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                Compressing…
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Compress PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {!result ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <FileDown className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No result yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload a PDF and click Compress</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className="text-xl font-semibold">{formatBytes(result.originalSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Compressed</p>
                    <p className="text-xl font-semibold">{formatBytes(result.compressedSize)}</p>
                  </div>
                </div>

                <div className="text-center">
                  {result.compressionRatio > 5 ? (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-4">
                      <p className="text-4xl font-bold text-green-600 dark:text-green-400">−{result.compressionRatio.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Saved {formatBytes(result.originalSize - result.compressedSize)}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Minimal reduction</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This PDF may already be optimized or is text-heavy.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {result && result.compressionRatio > 0 && (
          <div className="shrink-0 border-t border-border p-4">
            <Button className="w-full" onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download Compressed PDF
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  )
}