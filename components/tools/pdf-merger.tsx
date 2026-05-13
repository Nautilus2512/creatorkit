"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { FileDown, Upload, X, Download, ArrowUp, ArrowDown, Scissors, Combine, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  const [announcement, setAnnouncement] = useState("")
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const splitInputRef = useRef<HTMLInputElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

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
    announceToScreenReader(`Added ${pdfFiles.length} file(s) to merge list`)
  }

  const handleSplitFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const file = fileList[0]
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      announceToScreenReader("Error: Please upload a PDF file")
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
      announceToScreenReader(`Loaded ${file.name} with ${pageCount} pages`)
    } catch (err) {
      setError('Could not read PDF. It may be corrupted or encrypted.')
      announceToScreenReader("Error: Could not read PDF")
    }
  }

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === files.length - 1) return
    
    const newFiles = [...files]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
    setFiles(newFiles)
    announceToScreenReader(`Moved ${newFiles[targetIndex].name} ${direction === 'up' ? 'up' : 'down'}`)
  }

  const removeFile = (id: string) => {
    const removed = files.find(f => f.id === id)
    setFiles(files.filter(f => f.id !== id))
    if (removed) announceToScreenReader(`Removed ${removed.name}`)
  }

  const processMerge = useCallback(async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDFs to merge')
      announceToScreenReader("Error: Please add at least 2 PDFs to merge")
      return
    }

    setIsProcessing(true)
    setError(null)
    setMergeResult(null)
    announceToScreenReader("Merging PDFs...")

    try {
      const mergedPdf = await PDFDocument.create()
      
      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach(page => mergedPdf.addPage(page))
      }

      const mergedBytes = await mergedPdf.save()
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' })
      setMergeResult(blob)
      setMergeResultSize(blob.size)
      announceToScreenReader(`PDFs merged successfully. Output size: ${formatBytes(blob.size)}`)
    } catch (err) {
      setError('Failed to merge PDFs. They may be encrypted or corrupted.')
      announceToScreenReader("Error: Failed to merge PDFs")
    } finally {
      setIsProcessing(false)
    }
  }, [files, announceToScreenReader])

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

  const processSplit = useCallback(async () => {
    if (!splitFile || !splitFile.pageCount) return

    setIsProcessing(true)
    setError(null)
    setSplitResults([])
    announceToScreenReader("Splitting PDF...")

    try {
      const arrayBuffer = await splitFile.file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      const ranges = parsePageRanges(pageRanges, splitFile.pageCount)
      
      if (ranges.length === 0) {
        setError('Invalid page range format')
        setIsProcessing(false)
        announceToScreenReader("Error: Invalid page range format")
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
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
        
        results.push({
          name: `${splitFile.name.replace('.pdf', '')}_part${i + 1}_pages${start}-${end}.pdf`,
          pages: `${start}-${end}`,
          blob,
          size: blob.size
        })
      }

      setSplitResults(results)
      announceToScreenReader(`PDF split into ${results.length} parts`)
    } catch (err) {
      setError('Failed to split PDF. Check your page range format.')
      announceToScreenReader("Error: Failed to split PDF")
    } finally {
      setIsProcessing(false)
    }
  }, [splitFile, pageRanges, announceToScreenReader])

  const downloadMerged = useCallback(() => {
    if (!mergeResult) return
    const url = URL.createObjectURL(mergeResult)
    const a = document.createElement('a')
    a.href = url
    a.download = `merged_${files.length}_pdfs.pdf`
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("Merged PDF downloaded")
  }, [mergeResult, files.length, announceToScreenReader])

  const downloadSplit = useCallback(async () => {
    if (splitResults.length === 0) return
    if (splitResults.length === 1) {
      const url = URL.createObjectURL(splitResults[0].blob)
      const a = document.createElement('a')
      a.href = url
      a.download = splitResults[0].name
      a.click()
      URL.revokeObjectURL(url)
      announceToScreenReader("Split PDF downloaded")
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
    announceToScreenReader("Split PDFs downloaded as ZIP")
  }, [splitResults, splitFile, announceToScreenReader])

  const downloadSingleSplit = useCallback((result: SplitResult) => {
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.name
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader(`Downloaded ${result.name}`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        if (mode === 'merge') processMerge()
        else processSplit()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        if (mode === 'merge') mergeInputRef.current?.click()
        else splitInputRef.current?.click()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
        if (mode === 'merge' && mergeResult) downloadMerged()
        else if (mode === 'split' && splitResults.length > 0) downloadSplit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, processMerge, processSplit, mergeResult, splitResults, downloadMerged, downloadSplit])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <ShortcutsModal
        pageName="PDF Merger & Splitter"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "E"], description: "Process PDFs" },
          { keys: ["Ctrl", "Shift", "O"], description: "Add files" },
          { keys: ["Ctrl", "Shift", "D"], description: "Download result" },
        ]}
      />
      <div className="flex h-full flex-col gap-3 p-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">PDF Merger & Splitter</h2>
          <p className="text-muted-foreground">Combine or extract PDF pages · 100% in-browser</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-labelledby="settings-label">
          <div className="flex-1 overflow-y-auto p-4 space-y-6" id="settings-label">

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg" role="tablist" aria-label="Operation mode">
              <button
                onClick={() => { setMode('merge'); announceToScreenReader("Merge mode selected") }}
                role="tab"
                aria-selected={mode === 'merge'}
                aria-controls="merge-panel"
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  mode === 'merge'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Combine className="h-4 w-4" aria-hidden="true" />
                Merge
              </button>
              <button
                onClick={() => { setMode('split'); announceToScreenReader("Split mode selected") }}
                role="tab"
                aria-selected={mode === 'split'}
                aria-controls="split-panel"
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  mode === 'split'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Scissors className="h-4 w-4" aria-hidden="true" />
                Split
              </button>
            </div>

            {mode === 'merge' ? (
              <div role="tabpanel" id="merge-panel" aria-label="Merge PDF files">
                {/* Merge Mode */}
                <div className="space-y-2" role="group" aria-labelledby="merge-files-label">
                  <Label className="text-sm font-medium" id="merge-files-label">PDF Files to Merge</Label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleMergeFiles(e.dataTransfer.files) }}
                    onClick={() => mergeInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") mergeInputRef.current?.click() }}
                    role="button"
                    tabIndex={0}
                    aria-label="Drop PDF files or click to browse"
                    className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
                      aria-label="Select PDF files to merge"
                    />
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm font-medium">Drop PDFs here or click to browse</p>
                      <p className="text-xs text-muted-foreground">Select multiple files · Order matters</p>
                    </div>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{files.length} PDF(s) selected</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setFiles([]); announceToScreenReader("All files cleared") }}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                        Clear all
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto" role="list" aria-label="Files to merge">
                      {files.map((pdf, index) => (
                        <div key={pdf.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20" role="listitem" aria-label={`File ${index + 1}: ${pdf.name}`}>
                          <span className="text-xs text-muted-foreground w-6" aria-hidden="true">{index + 1}.</span>
                          <FileDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{pdf.name}</p>
                            <p className="text-xs text-muted-foreground">{formatBytes(pdf.size)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveFile(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                              aria-label={`Move ${pdf.name} up`}
                            >
                              <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => moveFile(index, 'down')}
                              disabled={index === files.length - 1}
                              className="p-1 rounded hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                              aria-label={`Move ${pdf.name} down`}
                            >
                              <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => removeFile(pdf.id)}
                              className="p-1 rounded hover:bg-red-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                              aria-label={`Remove ${pdf.name}`}
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Use arrows to reorder. First file's pages will appear first.</p>
                  </div>
                )}
              </div>
            ) : (
              <div role="tabpanel" id="split-panel" aria-label="Split PDF file">
                {/* Split Mode */}
                <div className="space-y-2" role="group" aria-labelledby="split-file-label">
                  <Label className="text-sm font-medium" id="split-file-label">PDF to Split</Label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleSplitFile(e.dataTransfer.files) }}
                    onClick={() => splitInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") splitInputRef.current?.click() }}
                    role="button"
                    tabIndex={0}
                    aria-label="Drop PDF file or click to browse"
                    className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <input
                      ref={splitInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => handleSplitFile(e.target.files)}
                      aria-label="Select PDF file to split"
                    />
                    {splitFile ? (
                      <div className="flex items-center gap-3 px-4 w-full">
                        <FileDown className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium">{splitFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(splitFile.size)} · {splitFile.pageCount} pages
                          </p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSplitFile(null); setSplitResults([]); announceToScreenReader("File removed") }}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
                        <p className="text-xs text-muted-foreground">One file only</p>
                      </div>
                    )}
                  </div>
                </div>

                {splitFile && (
                  <div className="space-y-3" role="group" aria-labelledby="page-ranges-label">
                    <Label className="text-sm font-medium" id="page-ranges-label">Page Ranges to Extract</Label>
                    <textarea
                      value={pageRanges}
                      onChange={(e) => { setPageRanges(e.target.value); announceToScreenReader("Page ranges updated") }}
                      className="w-full p-3 border rounded-lg bg-background text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      rows={3}
                      placeholder="1-5, 6-10, 11-end"
                      aria-label="Page ranges to extract"
                    />
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-1" role="note" aria-label="Syntax help">
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
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border p-4">
            <Button 
              className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" 
              onClick={mode === 'merge' ? processMerge : processSplit}
              disabled={isProcessing || (mode === 'merge' ? files.length < 2 : !splitFile)}
              aria-label={isProcessing ? "Processing" : mode === 'merge' ? `Merge ${files.length} PDFs` : "Split PDF"}
            >
              {isProcessing ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                  Processing…
                </>
              ) : mode === 'merge' ? (
                <>
                  <Combine className="mr-2 h-4 w-4" aria-hidden="true" />
                  Merge {files.length} PDFs
                  <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+E</kbd>
                </>
              ) : (
                <>
                  <Scissors className="mr-2 h-4 w-4" aria-hidden="true" />
                  Split PDF
                  <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+E</kbd>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-labelledby="results-label">
          <div className="flex-1 overflow-y-auto p-4" id="results-label">
            {mode === 'merge' ? (
              !mergeResult ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                  <div className="rounded-full border border-border bg-muted/50 p-4">
                    <Combine className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
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
                      <p className="text-4xl font-bold text-green-600 dark:text-green-400" aria-live="polite">✓</p>
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
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                  <div className="rounded-full border border-border bg-muted/50 p-4">
                    <Scissors className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No split results yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload a PDF and set page ranges</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center justify-between" role="status">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{splitResults.length} parts</span>
                      {" created from "}{splitFile?.pageCount} pages
                    </div>
                  </div>
                  
                  {splitResults.map((result, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5" role="listitem" aria-label={`Part ${i + 1}: ${result.name}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Pages {result.pages} · {formatBytes(result.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadSingleSplit(result)}
                        className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label={`Download ${result.name}`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {(mode === 'merge' && mergeResult) || (mode === 'split' && splitResults.length > 0) ? (
            <div className="shrink-0 border-t border-border p-4">
              <Button 
                className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" 
                onClick={mode === 'merge' ? downloadMerged : downloadSplit}
                aria-label={mode === 'merge' ? "Download merged PDF" : splitResults.length > 1 ? "Download all as ZIP" : "Download split PDF"}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                {mode === 'merge' ? 'Download Merged PDF' : splitResults.length > 1 ? 'Download All as ZIP' : 'Download'}
                <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+D</kbd>
              </Button>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </>
  )
}