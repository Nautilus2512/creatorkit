"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
  const [testMode, setTestMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

const loadFFmpeg = async () => {
  if (ffmpegRef.current) return ffmpegRef.current
  
  setIsLoadingFFmpeg(true)
  setError(null)
  
  try {
    const ffmpeg = new FFmpeg()
    
    // Try multiple CDNs with longer timeout
    const baseURLs = [
    "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
    "https://gitcdn.xyz/repo/@ffmpeg/core@0.12.6/dist/umd",
    "https://cdn.skypack.dev/@ffmpeg/core@0.12.6/dist/umd"
    ]
    
    let loaded = false
    let lastError: any = null
    let progressInterval: NodeJS.Timeout | null = null
    
    for (const baseURL of baseURLs) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
            console.log(`Trying to load ffmpeg from: ${baseURL} (attempt ${attempt})`)
            
            progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90))
            }, 1000)
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => {
                if (progressInterval) clearInterval(progressInterval)
                reject(new Error("Load timeout"))
                }, 60000)
            )
            
            await Promise.race([
                ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                }),
                timeoutPromise
            ])
            
            if (progressInterval) clearInterval(progressInterval)
            setProgress(100)
            console.log(`Successfully loaded ffmpeg from: ${baseURL}`)
            loaded = true
            break
            } catch (err) {
            if (progressInterval) clearInterval(progressInterval)
            console.warn(`Attempt ${attempt} failed for ${baseURL}:`, err)
            if (attempt === 3) {
                lastError = err
                continue // Try next CDN
            }
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000))
            }
        }
        }
    
    if (!loaded) {
      throw lastError || new Error("All CDN sources failed. Please check your internet connection.")
    }
    
    ffmpegRef.current = ffmpeg
    setFfmpegLoaded(true)
    setProgress(0) // Reset progress after successful load
    return ffmpeg
  } catch (err) {
    console.error("FFmpeg init error:", err)
    setError("Failed to load audio converter. The ffmpeg.wasm files are large (~25MB) and may take time to load. Please ensure good internet connection.")
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
    if (testMode) {
      // Test mode - simulate conversion without ffmpeg
      console.log("Test mode: simulating conversion")
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Simulate result
      const mockBlob = new Blob(["mock audio data"], { type: `audio/${targetFormat}` })
      const url = URL.createObjectURL(mockBlob)
      
      setResult({
        blob: mockBlob,
        url,
        name: `${file.name.replace(/\.[^/.]+$/, '')}_converted.${targetFormat}`,
        size: file.size * 0.8 // Simulate size reduction
      })
    } else {
      // Normal mode - use ffmpeg
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
    }
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+O - Upload file (trigger file input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        inputRef.current?.click()
      }
      // Ctrl+Enter - Convert
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (file && !isConverting && !isLoadingFFmpeg) {
          convert()
        }
      }
      // Ctrl+D - Download (when result available)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (result) {
          download()
        }
      }
      // Ctrl+T - Toggle test mode
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        setTestMode(prev => !prev)
      }
      // Number keys 1-8 for format selection (when not typing in an input)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const activeElement = document.activeElement
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          const num = parseInt(e.key)
          if (num >= 1 && num <= FORMATS.length) {
            e.preventDefault()
            setTargetFormat(FORMATS[num - 1].value)
          }
          // Q key for quality selection cycle
          if (e.key === 'q' || e.key === 'Q') {
            e.preventDefault()
            setQuality(prev => {
              if (prev === 'high') return 'medium'
              if (prev === 'medium') return 'low'
              return 'high'
            })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [file, isConverting, isLoadingFFmpeg, result, convert])

  return (
    <>
    <ShortcutsModal
      pageName="Audio Converter"
      shortcuts={[
        { keys: ["Ctrl", "Enter"], description: "Convert audio" },
        { keys: ["Ctrl", "O"], description: "Upload file" },
        { keys: ["Ctrl", "D"], description: "Download converted file" },
        { keys: ["Ctrl", "T"], description: "Toggle test mode" },
        { keys: ["1"], description: "Select MP3 format" },
        { keys: ["2"], description: "Select WAV format" },
        { keys: ["3"], description: "Select OGG format" },
        { keys: ["4"], description: "Select FLAC format" },
        { keys: ["Q"], description: "Cycle quality (High→Medium→Low)" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Audio Converter</h2>
        <p className="text-muted-foreground">Convert between audio formats · Powered by ffmpeg.wasm</p>
      </div>

      {/* Development Warning - merged note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              ⚠️ Under Development - ~25MB download required on first use
            </p>
            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5 list-disc list-inside">
              <li>CDN loading issues may occur - use "Test mode" to simulate conversion</li>
              <li>This tool is experimental and may not work in all environments</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
      {/* Left panel */}
      <div className="flex flex-col rounded-xl border border-border bg-card lg:overflow-hidden lg:max-h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* File upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Audio File</Label>
              <span className="text-xs text-muted-foreground"><kbd className="px-1 rounded bg-muted font-mono">Ctrl+O</kbd> to upload</span>
            </div>
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
                  <FileAudio className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium" id="selected-file-name">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                      {audioInfo?.duration && ` · ${formatDuration(audioInfo.duration)}`}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Remove selected file"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium">Drop audio file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">MP3, WAV, OGG, FLAC, AAC, M4A, WMA, OPUS</p>
                </div>
              )}
            </div>
          </div>

          {/* Conversion settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" id="format-label">Target Format</Label>
                <span className="text-xs text-muted-foreground">Press 1-8 to select</span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="format-label">
                {FORMATS.map((fmt, index) => (
                  <button
                    key={fmt.value}
                    onClick={() => setTargetFormat(fmt.value)}
                    className={`p-3 rounded-lg border text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      targetFormat === fmt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    role="radio"
                    aria-checked={targetFormat === fmt.value}
                    aria-label={`${fmt.label} - ${fmt.desc}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{fmt.label}</span>
                      <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{index + 1}</kbd>
                    </div>
                    <div className="text-xs text-muted-foreground">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="rounded border-border"
                  aria-label="Enable test mode to skip ffmpeg loading"
                />
                <span className="text-xs">Test mode <kbd className="px-1 rounded bg-muted font-mono text-[10px]">Ctrl+T</kbd></span>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" id="quality-label">Quality</Label>
                <span className="text-xs text-muted-foreground">Press <kbd className="px-1 rounded bg-muted font-mono">Q</kbd> to cycle</span>
              </div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="quality-label">
                {[
                  { value: "high", label: "High", desc: "320kbps / Best" },
                  { value: "medium", label: "Medium", desc: "192kbps / Good" },
                  { value: "low", label: "Low", desc: "128kbps / Small" },
                ].map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuality(q.value as "high" | "medium" | "low")}
                    className={`p-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      quality === q.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    role="radio"
                    aria-checked={quality === q.value}
                    aria-label={`${q.label} quality - ${q.desc}`}
                  >
                    <div className="font-medium">{q.label}</div>
                    <div className="text-xs text-muted-foreground">{q.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500" role="alert" aria-live="assertive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

        </div>

        <div className="shrink-0 border-t border-border p-4">
          {file && !isConverting && !isLoadingFFmpeg && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              <kbd className="px-1 rounded bg-muted font-mono">Ctrl+Enter</kbd> to convert
            </p>
          )}
          {isLoadingFFmpeg && (
            <div className="mb-3" role="status" aria-live="polite" aria-label="Loading ffmpeg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Loading ffmpeg.wasm...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100} aria-label="Loading progress">
                <div className="bg-primary h-2 rounded-full animate-pulse w-1/2"></div>
              </div>
            </div>
          )}
          
          {isConverting && (
            <div className="mb-3" role="status" aria-live="polite" aria-label="Converting audio">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Converting...</span>
                <span aria-live="polite">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Conversion progress">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={convert}
            disabled={!file || isConverting || isLoadingFFmpeg}
            aria-label={isConverting ? "Converting audio, please wait" : isLoadingFFmpeg ? "Loading ffmpeg" : file ? "Convert audio file" : "Upload a file to convert"}
          >
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Converting...</span>
              </>
            ) : isLoadingFFmpeg ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Convert Audio</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col rounded-xl border border-border bg-card lg:overflow-hidden lg:max-h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-y-auto p-4">
          {!result ? (
            <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-3 text-center">
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
            <p className="text-xs text-muted-foreground text-center mb-2">
              <kbd className="px-1 rounded bg-muted font-mono">Ctrl+D</kbd> to download
            </p>
            <Button 
              className="w-full" 
              onClick={download}
              aria-label={`Download converted audio file in ${targetFormat.toUpperCase()} format`}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Download {targetFormat.toUpperCase()}</span>
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  )
}