"use client"

import { useState, useRef } from "react"
import { FileDown, Upload, X, Download, ArrowUp, ArrowDown, Scissors, Combine, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  pageCount?: number
}

interface SplitResult {
  name: string
  pages: string
  blob: Blob
  size: number
}

export function PDFMerger() {
  const [mode, setMode] = useState<'merge' | 'split'>('merge')
  const [files, setFiles] = useState<PDFFile[]>([])
  const [splitFile, setSplitFile] = useState<PDFFile | null>(null)
  const [pageRanges, setPageRanges] = useState<string>('1-5, 6-10, 11-end')
  const [isProcessing, setIsProcessing] = useState(false)
  const [mergeResult, setMergeResult] = useState<Blob | null>(null)
  const [mergeResultSize, setMergeResultSize] = useState(0)
  const [splitResults, setSplitResults] = useState<SplitResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const splitInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleMergeFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return
    setError(null)
    
    const pdfFiles: PDFFile[] = []
    for (const file of Array.from(newFiles)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError(`Skipped ${file.name} - not a PDF`)
        continue
      }
      pdfFiles.push({
        id: generateId(),
        file,
        name: file.name,
        size: file.size
      })
    }
    
    setFiles(prev => [...prev, ...pdfFiles])
  }

  const handleSplitFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const file = fileList[0]
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      const pageCount = pdf.getPageCount()
      
      setSplitFile({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        pageCount
      })
      setPageRanges(`1-${Math.ceil(pageCount/2)}, ${Math.ceil(pageCount/2)+1}-end`)
      setError(null)
    } catch (err) {
      setError('Could not read PDF. It may be corrupted or encrypted.')
    }
  }

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === files.length - 1) return
    
    const newFiles = [...files]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
    setFiles(newFiles)
  }

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id))
  }

  const processMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDFs to merge')
      return
    }

    setIsProcessing(true)
    setError(null)
    setMergeResult(null)

    try {
      const mergedPdf = await PDFDocument.create()
      
      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach(page => mergedPdf.addPage(page))
      }

      const mergedBytes = await mergedPdf.save()
      // @ts-ignore
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' })
      setMergeResult(blob)
      setMergeResultSize(blob.size)
    } catch (err) {
      setError('Failed to merge PDFs. They may be encrypted or corrupted.')
    } finally {
      setIsProcessing(false)
    }
  }

  const parsePageRanges = (input: string, totalPages: number): Array<{ start: number; end: number }> => {
    const ranges: Array<{ start: number; end: number }> = []
    const parts = input.split(',').map(p => p.trim())
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(s => s.trim())
        const start = startStr === 'end' ? totalPages : parseInt(startStr) || 1
        const end = endStr === 'end' || !endStr ? totalPages : parseInt(endStr) || totalPages
        ranges.push({ start: Math.max(1, start), end: Math.min(totalPages, end) })
      } else if (part) {
        const page = parseInt(part)
        if (page && page >= 1 && page <= totalPages) {
          ranges.push({ start: page, end: page })
        }
      }
    }
    
    return ranges
  }

  const processSplit = async () => {
    if (!splitFile || !splitFile.pageCount) return

    setIsProcessing(true)
    setError(null)
    setSplitResults([])

    try {
      const arrayBuffer = await splitFile.file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      const ranges = parsePageRanges(pageRanges, splitFile.pageCount)
      
      if (ranges.length === 0) {
        setError('Invalid page range format')
        setIsProcessing(false)
        return
      }

      const results: SplitResult[] = []

      for (let i = 0; i < ranges.length; i++) {
        const { start, end } = ranges[i]
        const newPdf = await PDFDocument.create()
        const pageIndices = Array.from({ length: end - start + 1 }, (_, j) => start - 1 + j)
        const copiedPages = await newPdf.copyPages(pdf, pageIndices)
        copiedPages.forEach(page => newPdf.addPage(page))
        
        const bytes = await newPdf.save()
        // @ts-ignore
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
        
        results.push({
          name: `${splitFile.name.replace('.pdf', '')}_part${i + 1}_pages${start}-${end}.pdf`,
          pages: `${start}-${end}`,
          blob,
          size: blob.size
        })
      }

      setSplitResults(results)
    } catch (err) {
      setError('Failed to split PDF. Check your page range format.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadMerged = () => {
    if (!mergeResult) return
    const url = URL.createObjectURL(mergeResult)
    const a = document.createElement('a')
    a.href = url
    a.download = `merged_${files.length}_pdfs.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSplit = async () => {
    if (splitResults.length === 0) return
    if (splitResults.length === 1) {
      const url = URL.createObjectURL(splitResults[0].blob)
      const a = document.createElement('a')
      a.href = url
      a.download = splitResults[0].name
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    const zip = new JSZip()
    for (const result of splitResults) {
      zip.file(result.name, result.blob)
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${splitFile?.name.replace('.pdf', '')}_split.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSingleSplit = (result: SplitResult) => {
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      <ShortcutsModal
        pageName="PDF Merger & Splitter"
        shortcuts={[
          { keys: ["Ctrl", "Enter"], description: "Process PDFs" },
          { keys: ["Ctrl", "O"], description: "Add files" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />

      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              {mode === 'merge' ? <Combine className="h-4 w-4 text-primary" /> : <Scissors className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <h1 className="text-base font-semibold">PDF Merger & Splitter</h1>
              <p className="text-xs text-muted-foreground">Combine or extract PDF pages · 100% in-browser</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setMode('merge')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'merge'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Combine className="h-4 w-4" />
              Merge
            </button>
            <button
              onClick={() => setMode('split')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'split'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Scissors className="h-4 w-4" />
              Split
            </button>
          </div>

          {mode === 'merge' ? (
            <>
              {/* Merge Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">PDF Files to Merge</Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleMergeFiles(e.dataTransfer.files) }}
                  onClick={() => mergeInputRef.current?.click()}
                  className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input
                    ref={mergeInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    multiple
                    onChange={(e) => handleMergeFiles(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop PDFs here or click to browse</p>
                    <p className="text-xs text-muted-foreground">Select multiple files · Order matters</p>
                  </div>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{files.length} PDF(s) selected</Label>
                    <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear all
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {files.map((pdf, index) => (
                      <div key={pdf.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
                        <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                        <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{pdf.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(pdf.size)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveFile(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveFile(index, 'down')}
                            disabled={index === files.length - 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFile(pdf.id)}
                            className="p-1 rounded hover:bg-red-100 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Use arrows to reorder. First file's pages will appear first.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Split Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">PDF to Split</Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleSplitFile(e.dataTransfer.files) }}
                  onClick={() => splitInputRef.current?.click()}
                  className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input
                    ref={splitInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleSplitFile(e.target.files)}
                  />
                  {splitFile ? (
                    <div className="flex items-center gap-3 px-4 w-full">
                      <FileDown className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{splitFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(splitFile.size)} · {splitFile.pageCount} pages
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSplitFile(null); setSplitResults([]) }}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
                      <p className="text-xs text-muted-foreground">One file only</p>
                    </div>
                  )}
                </div>
              </div>

              {splitFile && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Page Ranges to Extract</Label>
                  <textarea
                    value={pageRanges}
                    onChange={(e) => setPageRanges(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-background text-sm font-mono"
                    rows={3}
                    placeholder="1-5, 6-10, 11-end"
                  />
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-1">
                    <p className="font-medium text-blue-700 dark:text-blue-300">Syntax examples:</p>
                    <ul className="space-y-0.5 text-blue-600 dark:text-blue-400 list-disc list-inside">
                      <li><code>1-5</code> - Pages 1 through 5</li>
                      <li><code>1-5, 10-15</code> - Two separate PDFs</li>
                      <li><code>1-5, 6-end</code> - Split in half</li>
                      <li><code>1, 3, 5-10</code> - Individual pages and ranges</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button 
            className="w-full" 
            onClick={mode === 'merge' ? processMerge : processSplit}
            disabled={isProcessing || (mode === 'merge' ? files.length < 2 : !splitFile)}
          >
            {isProcessing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                Processing…
              </>
            ) : mode === 'merge' ? (
              <>
                <Combine className="mr-2 h-4 w-4" />
                Merge {files.length} PDFs
              </>
            ) : (
              <>
                <Scissors className="mr-2 h-4 w-4" />
                Split PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'merge' ? (
            !mergeResult ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full border border-border bg-muted/50 p-4">
                  <Combine className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No merged PDF yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add files and click Merge</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-600 dark:text-green-400">✓</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">Merge Complete</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Files Merged</p>
                      <p className="text-xl font-semibold">{files.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Result Size</p>
                      <p className="text-xl font-semibold">{formatBytes(mergeResultSize)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            splitResults.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full border border-border bg-muted/50 p-4">
                  <Scissors className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No split results yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload a PDF and set page ranges</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{splitResults.length} parts</span>
                    {" created from "}{splitFile?.pageCount} pages
                  </div>
                </div>
                
                {splitResults.map((result, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pages {result.pages} · {formatBytes(result.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadSingleSplit(result)}
                      className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {(mode === 'merge' && mergeResult) || (mode === 'split' && splitResults.length > 0) ? (
          <div className="shrink-0 border-t border-border p-4">
            <Button className="w-full" onClick={mode === 'merge' ? downloadMerged : downloadSplit}>
              <Download className="mr-2 h-4 w-4" />
              {mode === 'merge' ? 'Download Merged PDF' : splitResults.length > 1 ? 'Download All as ZIP' : 'Download'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}