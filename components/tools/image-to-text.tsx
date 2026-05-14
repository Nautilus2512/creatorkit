"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, Copy, Check, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface ExtractionResult {
  text: string
  confidence: number
}

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

export default function ImageToText() {
  const [image, setImage] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [workerReady, setWorkerReady] = useState(false)
  const [workerLoading, setWorkerLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workerRef = useRef<any>(null)

  const loadWorker = useCallback(async () => {
    if (workerRef.current || workerLoading) return

    setWorkerLoading(true)
    setError(null)
    setProgress(0)
    setProgressText("Initializing OCR engine...")

    try {
      const { createWorker } = await import("tesseract.js")

      const worker = await createWorker("eng", 1, {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status) setProgressText(m.status)
          if (m.progress !== undefined) {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      workerRef.current = worker
      setWorkerReady(true)
      setProgressText("OCR engine ready")
      announceToScreenReader("OCR engine ready")
    } catch (err) {
      console.error("Failed to load Tesseract worker:", err)
      setError("Failed to load OCR engine. Please refresh and try again.")
      announceToScreenReader("Failed to load OCR engine")
    } finally {
      setWorkerLoading(false)
    }
  }, [workerLoading])

  const extractText = useCallback(async (imageData: string) => {
    if (!workerRef.current) {
      await loadWorker()
      if (!workerRef.current) {
        setError("OCR engine not ready. Please wait and try again.")
        return
      }
    }

    setExtracting(true)
    setError(null)
    setResult(null)
    setProgress(0)
    setProgressText("Loading image...")
    announceToScreenReader("Extracting text from image")

    try {
      const img = new window.Image()
      img.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = imageData
      })

      setProgressText("Preprocessing image...")

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      const maxDim = 2000
      let width = img.width
      let height = img.height

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim)
          width = maxDim
        } else {
          width = Math.round((width / height) * maxDim)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      setProgressText("Recognizing text...")
      setProgress(50)

      const { data } = await workerRef.current.recognize(canvas)

      const text = data.text.trim()
      const confidence = data.confidence / 100

      setProgress(100)
      setProgressText("Complete")

      if (!text || text.length === 0) {
        setResult({ text: "No text detected in this image.", confidence: 0 })
        announceToScreenReader("No text detected in this image")
      } else {
        const wordCount = text.split(/\s+/).filter(Boolean).length
        setResult({ text, confidence })
        announceToScreenReader(`Extracted ${wordCount} words`)
        setActiveTab("output")
      }
    } catch (err) {
      console.error("Extraction error:", err)
      setError("Failed to extract text. Please try again with a clearer image.")
      announceToScreenReader("Extraction failed")
    } finally {
      setExtracting(false)
    }
  }, [loadWorker])

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setImage(dataUrl)
        setResult(null)
        setError(null)
        extractText(dataUrl)
      }
      reader.onerror = () => {
        setError("Failed to read file")
      }
      reader.readAsDataURL(file)
    },
    [extractText]
  )

  const copyText = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result.text)
    setCopied(true)
    announceToScreenReader("Text copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const clearImage = useCallback(() => {
    setImage(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        inputRef.current?.click()
        announceToScreenReader("Upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c" && result) {
        e.preventDefault()
        copyText()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [result, copyText])

  return (
    <div className="flex h-full flex-col" role="main" aria-label="Image to Text tool">
      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Image to Text</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Image to Text"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Open file picker" },
              { keys: ["Ctrl", "Shift", "C"], description: "Copy extracted text" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            aria-label="Upload image for text extraction"
          >
            <Upload className="h-4 w-4 mr-1" aria-hidden="true" />
            Extract Text
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Image to Text</h2>
          <ShortcutsModal
            pageName="Image to Text"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "O"], description: "Open file picker" },
              { keys: ["Ctrl", "Shift", "C"], description: "Copy extracted text" },
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
            Text
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel — Upload */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="image-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="image-panel-label">Image</span>
            {!workerReady && !workerLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { loadWorker(); announceToScreenReader("Loading OCR engine") }}
                className="text-xs h-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Load OCR engine"
              >
                <Loader2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Load OCR Engine
              </Button>
            )}
            {workerLoading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1" aria-live="polite">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {progressText || "Loading..."}
              </span>
            )}
            {workerReady && (
              <span className="text-xs text-green-600 dark:text-green-400" role="status" aria-live="polite">
                Engine ready
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop image here or click to upload"
              aria-describedby="upload-hint"
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Select image file to extract text"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              {image ? (
                <div className="relative w-full p-2">
                  <img
                    src={image}
                    alt="Uploaded image for text extraction"
                    className="max-h-[300px] w-full object-contain rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearImage()
                    }}
                    className="absolute top-4 right-4"
                    aria-label="Remove image"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <div className="rounded-full border border-border bg-muted/50 p-4">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drop an image here</p>
                    <p
                      className="text-xs text-muted-foreground mt-1"
                      id="upload-hint"
                    >
                      or click to browse ·{" "}
                      <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">
                        Ctrl+Shift+O
                      </kbd>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {extracting && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2
                    className="h-4 w-4 animate-spin shrink-0"
                    aria-hidden="true"
                  />
                  <span>{progressText || "Extracting text..."}</span>
                </div>
                {progress > 0 && progress < 100 && (
                  <div
                    className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div
                className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Results */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="results-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="results-panel-label">Extracted Text</span>
            {result && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyText}
                className="text-xs h-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={copied ? "Text copied to clipboard" : "Copy extracted text to clipboard"}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                )}
                {copied ? "Copied!" : "Copy"}
                <kbd
                  className="ml-1.5 rounded border border-border/30 bg-muted/30 px-1 text-[10px]"
                  aria-hidden="true"
                >
                  Ctrl+Shift+C
                </kbd>
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!result && !extracting ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full border border-border bg-muted/50 p-4">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No text extracted yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload an image to extract text
                  </p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {result.confidence > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Confidence:</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round(result.confidence * 100)}%`,
                          backgroundColor:
                            result.confidence > 0.7
                              ? "#22c55e"
                              : result.confidence > 0.4
                              ? "#eab308"
                              : "#ef4444",
                        }}
                        role="progressbar"
                        aria-valuenow={Math.round(result.confidence * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <span>{Math.round(result.confidence * 100)}%</span>
                  </div>
                )}
                <div
                  className="rounded-lg border border-border bg-muted/20 p-4 whitespace-pre-wrap text-sm leading-relaxed"
                  role="region"
                  aria-label="Extracted text"
                >
                  {result.text}
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.text.split(/\s+/).filter(Boolean).length} words ·{" "}
                  {result.text.length} characters
                </p>
              </div>
            ) : null}
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
          onClick={copyText}
          disabled={!result}
          aria-label={copied ? "Text copied to clipboard" : "Copy extracted text to clipboard"}
        >
          {copied ? (
            <Check className="h-4 w-4 mr-1" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
          )}
          {copied ? "Copied!" : "Copy Text"}
        </Button>
      </div>
    </div>
  )
}
