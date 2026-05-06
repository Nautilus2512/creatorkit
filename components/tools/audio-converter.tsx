"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, Download, Music, AlertCircle, X, FileAudio, Settings, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

const FORMATS = [
  { value: "mp3", label: "MP3", desc: "Compressed, widely supported" },
  { value: "wav", label: "WAV", desc: "Uncompressed, high quality" },
  { value: "ogg", label: "OGG", desc: "Open source, good compression" },
  { value: "flac", label: "FLAC", desc: "Lossless compression" },
  { value: "aac", label: "AAC", desc: "Advanced Audio Coding" },
  { value: "m4a", label: "M4A", desc: "Apple audio format" },
  { value: "wma", label: "WMA", desc: "Windows Media Audio" },
  { value: "opus", label: "OPUS", desc: "Low latency, streaming" },
] as const

type Format = typeof FORMATS[number]["value"]

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [audioInfo, setAudioInfo] = useState<{ duration: number; bitrate: number } | null>(null)
  const [targetFormat, setTargetFormat] = useState<Format>("mp3")
  const [quality, setQuality] = useState<"high" | "medium" | "low">("medium")
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ blob: Blob; url: string; name: string; size: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current
    
    setIsLoadingFFmpeg(true)
    setError(null)
    
    try {
      const ffmpeg = new FFmpeg()
      
      // Load ffmpeg.wasm from CDN
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      })
      
      ffmpegRef.current = ffmpeg
      setFfmpegLoaded(true)
      return ffmpeg
    } catch (err) {
      setError("Failed to load audio converter. Please check your internet connection.")
      throw err
    } finally {
      setIsLoadingFFmpeg(false)
    }
  }

  const getQualityParams = (fmt: Format, q: "high" | "medium" | "low"): string[] => {
    const bitrate = q === "high" ? "320k" : q === "medium" ? "192k" : "128k"
    
    switch (fmt) {
      case "mp3":
        return ["-b:a", bitrate, "-ar", "44100"]
      case "ogg":
        return ["-q:a", q === "high" ? "7" : q === "medium" ? "5" : "3"]
      case "opus":
        return ["-b:a", bitrate]
      case "aac":
      case "m4a":
        return ["-b:a", bitrate, "-c:a", "aac"]
      case "flac":
        return ["-compression_level", q === "high" ? "8" : q === "medium" ? "5" : "2"]
      case "wma":
        return ["-b:a", bitrate]
      default:
        return []
    }
  }

  const handleFile = async (f: File) => {
    // Check if audio file
    if (!f.type.startsWith('audio/') && !['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.opus'].some(ext => 
      f.name.toLowerCase().endsWith(ext)
    )) {
      setError("Please upload an audio file (MP3, WAV, OGG, FLAC, etc.)")
      return
    }

    setFile(f)
    setResult(null)
    setError(null)
    setAudioInfo(null)

    // Try to get audio info using Audio element
    try {
      const url = URL.createObjectURL(f)
      const audio = new Audio()
      audio.preload = "metadata"
      
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve
        audio.onerror = reject
        audio.src = url
      })
      
      setAudioInfo({
        duration: audio.duration,
        bitrate: 0 // Would need more complex analysis
      })
      
      URL.revokeObjectURL(url)
    } catch (err) {
      // Silent fail - we can still convert without duration info
    }
  }

  const convert = async () => {
    if (!file) return

    setIsConverting(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      // Ensure FFmpeg is loaded
      let ffmpeg = ffmpegRef.current
      if (!ffmpeg) {
        ffmpeg = await loadFFmpeg()
      }

      // Write input file
      const inputName = `input.${file.name.split('.').pop()}`
      const outputName = `output.${targetFormat}`
      
      ffmpeg.on("log", ({ message }) => {
        // Parse progress from ffmpeg output
        const match = message.match(/time=(\d+):(\d+):(\d+\.\d+)/)
        if (match && audioInfo?.duration) {
          const [, hours, minutes, seconds] = match
          const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)
          const pct = Math.min(100, Math.round((currentTime / audioInfo.duration) * 100))
          setProgress(pct)
        }
      })

      await ffmpeg.writeFile(inputName, await fetchFile(file))

      // Build ffmpeg command
      const qualityParams = getQualityParams(targetFormat, quality)
      const args = ["-i", inputName, ...qualityParams, "-y", outputName]
      
      await ffmpeg.exec(args)

      // Read output file
      const data = await ffmpeg.readFile(outputName)
      // @ts-ignore
      const blob = new Blob([data as unknown as BlobPart], { type: `audio/${targetFormat}` })
      const url = URL.createObjectURL(blob)

      setResult({
        blob,
        url,
        name: `${file.name.replace(/\.[^/.]+$/, '')}_converted.${targetFormat}`,
        size: blob.size
      })
      setProgress(100)

      // Cleanup
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)
    } catch (err) {
      console.error(err)
      setError("Conversion failed. The file may be corrupted or in an unsupported format.")
    } finally {
      setIsConverting(false)
      setProgress(0)
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result.url
    a.download = result.name
    a.click()
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      <ShortcutsModal
        pageName="Audio Converter"
        shortcuts={[
          { keys: ["Ctrl", "Enter"], description: "Convert audio" },
          { keys: ["Ctrl", "O"], description: "Upload file" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />

      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Audio Converter</h1>
              <p className="text-xs text-muted-foreground">Convert between audio formats · Powered by ffmpeg.wasm</p>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Audio File</Label>
            <div
              onClick={() => inputRef.current?.click()}
              className="relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.wma,.opus"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <FileAudio className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                      {audioInfo?.duration && ` · ${formatDuration(audioInfo.duration)}`}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop audio file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">MP3, WAV, OGG, FLAC, AAC, M4A, WMA, OPUS</p>
                </div>
              )}
            </div>
          </div>

          {/* Conversion settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setTargetFormat(fmt.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      targetFormat === fmt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{fmt.label}</div>
                    <div className="text-xs text-muted-foreground">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Quality</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "high", label: "High", desc: "320kbps / Best" },
                  { value: "medium", label: "Medium", desc: "192kbps / Good" },
                  { value: "low", label: "Low", desc: "128kbps / Small" },
                ].map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuality(q.value as "high" | "medium" | "low")}
                    className={`p-2 rounded-lg border text-sm transition-all ${
                      quality === q.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium">{q.label}</div>
                    <div className="text-xs text-muted-foreground">{q.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          {!ffmpegLoaded && !isLoadingFFmpeg && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs">
              <p className="text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> Audio converter requires downloading ~25MB of WASM files on first use.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          {isLoadingFFmpeg && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading ffmpeg.wasm...
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse w-1/2"></div>
              </div>
            </div>
          )}
          
          {isConverting && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Converting...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={convert}
            disabled={!file || isConverting || isLoadingFFmpeg}
          >
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : isLoadingFFmpeg ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Convert Audio
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {!result ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Music className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No converted audio yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload and convert to see result</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">✓</p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">Conversion Complete</p>
                </div>
                
                <audio controls className="w-full">
                  <source src={result.url} type={`audio/${targetFormat}`} />
                  Your browser does not support the audio element.
                </audio>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className="text-sm font-semibold">{formatBytes(file?.size || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Converted</p>
                    <p className="text-sm font-semibold">{formatBytes(result.size)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className="shrink-0 border-t border-border p-4">
            <Button className="w-full" onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download {targetFormat.toUpperCase()}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}