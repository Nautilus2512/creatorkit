"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

type Preset = "high" | "medium" | "low"
const PRESETS: Record<Preset, { crf: number; label: string; hint: string }> = {
  high: { crf: 23, label: "High quality", hint: "~60-80% of original size" },
  medium: { crf: 28, label: "Balanced", hint: "~40-60% of original size" },
  low: { crf: 35, label: "Small file", hint: "~20-40% of original size" },
}

export default function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [outputUrl, setOutputUrl] = useState("")
  const [outputSize, setOutputSize] = useState(0)
  const [preset, setPreset] = useState<Preset>("medium")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("")
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const ffmpegRef = useRef<any>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setVideoUrl(URL.createObjectURL(f))
    setOutputUrl("")
    setError("")
    e.target.value = ""
    announceToScreenReader(`Video loaded: ${f.name}, ${fmtBytes(f.size)}`)
  }, [announceToScreenReader])

  const compress = useCallback(async () => {
    if (!file) return
    setLoading(true); setProgress(0); setOutputUrl(""); setError("")
    announceToScreenReader("Starting compression")

    try {
      // Lazy-load ffmpeg
      if (!ffmpegRef.current) {
        setStage("Loading ffmpeg…")
        const { FFmpeg } = await import("@ffmpeg/ffmpeg")
        const { fetchFile, toBlobURL } = await import("@ffmpeg/util")
        const ff = new FFmpeg()
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
        ff.on("progress", ({ progress: p }: { progress: number }) => setProgress(Math.round(p * 100)))
        await ff.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        })
        ffmpegRef.current = { ff, fetchFile }
      }

      const { ff, fetchFile } = ffmpegRef.current
      const ext = file.name.split(".").pop() || "mp4"
      const inName = `input.${ext}`
      const outName = "output.mp4"

      setStage("Reading file…")
      await ff.writeFile(inName, await fetchFile(file))

      setStage("Compressing…")
      const crf = PRESETS[preset].crf
      await ff.exec(["-i", inName, "-c:v", "libx264", "-crf", String(crf), "-preset", "fast", "-c:a", "aac", "-b:a", "128k", outName])

      setStage("Finalizing…")
      const data = await ff.readFile(outName)
      const blob = new Blob([data], { type: "video/mp4" })
      setOutputSize(blob.size)
      setOutputUrl(URL.createObjectURL(blob))
      setStage("")
      announceToScreenReader(`Compression complete: ${fmtBytes(blob.size)}`)
    } catch (err: any) {
      setError("Compression failed. Try a smaller file or different format.")
      announceToScreenReader("Compression failed")
      console.error(err)
    }
    setLoading(false); setProgress(0); setStage("")
  }, [file, preset, announceToScreenReader])

  const download = useCallback(() => {
    if (!outputUrl) return
    const name = (file?.name.replace(/\.[^.]+$/, "") || "compressed") + "-compressed.mp4"
    const a = Object.assign(document.createElement("a"), { href: outputUrl, download: name })
    a.click()
    announceToScreenReader("Video downloaded")
  }, [outputUrl, file, announceToScreenReader])

  const changePreset = useCallback((newPreset: Preset) => {
    setPreset(newPreset)
    announceToScreenReader(`Quality preset changed to ${PRESETS[newPreset].label}`)
  }, [announceToScreenReader])

  const clearFile = useCallback(() => {
    setFile(null)
    setVideoUrl("")
    setOutputUrl("")
    setOutputSize(0)
    setError("")
    announceToScreenReader("Video cleared")
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            if (file && !loading) {
              e.preventDefault()
              compress()
            }
            break
          case "d":
            if (outputUrl) {
              e.preventDefault()
              download()
            }
            break
          case "1":
            e.preventDefault()
            changePreset("high")
            break
          case "2":
            e.preventDefault()
            changePreset("medium")
            break
          case "3":
            e.preventDefault()
            changePreset("low")
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [file, loading, outputUrl, compress, download, changePreset])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Compress video" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download compressed video" },
    { keys: ["Ctrl", "Shift", "1"], description: "High quality preset" },
    { keys: ["Ctrl", "Shift", "2"], description: "Balanced preset" },
    { keys: ["Ctrl", "Shift", "3"], description: "Small file preset" },
  ]

  const savings = file && outputSize ? Math.round((1 - outputSize / file.size) * 100) : 0

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Video Compressor</h2>
          <p className="text-muted-foreground">Compress videos using ffmpeg.wasm. Runs entirely in your browser — no uploads.</p>
        </div>
        <ShortcutsModal pageName="Video Compressor" shortcuts={shortcuts} />
      </div>

      {outputUrl && (
        <Button size="sm" onClick={download} className="focus:outline-none focus:ring-2 focus:ring-primary/50 self-start" aria-label="Download compressed video">
          <Download className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Download MP4</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
            <span>Ctrl</span><span>Shift</span><span>D</span>
          </kbd>
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Quality preset selection">
        <Label className="text-xs text-muted-foreground" id="preset-label">Quality preset:</Label>
        {(Object.entries(PRESETS) as [Preset, typeof PRESETS[Preset]][]).map(([key, { label, hint }], index) => (
          <button 
            key={key} 
            onClick={() => changePreset(key)}
            role="radio"
            aria-checked={preset === key}
            aria-label={`${label}: ${hint}`}
            title={`${hint} (Ctrl+Shift+${index + 1})`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary/50 ${preset === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            <span className="font-medium">{label}</span>
            <span className="ml-1 opacity-70">— {hint}</span>
            <kbd className="ml-1.5 pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-background/60 px-1 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
              <span>Ctrl</span><span>Shift</span><span>{index + 1}</span>
            </kbd>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Input video panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium" id="original-label">Original{file ? ` — ${fmtBytes(file.size)}` : ""}</h3>
            <label className="cursor-pointer">
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} aria-label={file ? "Change video file" : "Upload video file"} />
              <Button variant="ghost" size="sm" asChild className="focus:outline-none focus:ring-2 focus:ring-primary/50">
                <span><Upload className="h-4 w-4 mr-1" aria-hidden="true" />{file ? "Change" : "Upload"}</span>
              </Button>
            </label>
          </div>
          {videoUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              <video 
                src={videoUrl} 
                controls 
                className="flex-1 w-full object-contain rounded-lg border border-border min-h-0 bg-black" 
                aria-label="Original video preview"
              />
              <Button 
                onClick={compress} 
                disabled={loading} 
                className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={loading ? `Compressing: ${stage} ${progress > 0 ? progress + "%" : ""}` : "Compress video"}
              >
                {loading ? `${stage} ${progress > 0 ? progress + "%" : ""}` : "Compress Video"}
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                  <span>Ctrl</span><span>Shift</span><span>C</span>
                </kbd>
              </Button>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50" role="button" tabIndex={0} aria-label="Upload video file">
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">Click to upload a video</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV — up to a few hundred MB</p>
            </label>
          )}
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Compressed output panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium" id="compressed-label">
              {outputUrl ? `Compressed — ${fmtBytes(outputSize)}` : "Compressed Output"}
              {savings > 0 && <span className="ml-2 text-green-700 text-xs font-normal" aria-label={`${savings}% smaller`}>-{savings}% smaller</span>}
            </h3>
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center p-6" role="alert" aria-live="assertive">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            </div>
          ) : outputUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              <video 
                src={outputUrl} 
                controls 
                className="flex-1 w-full object-contain rounded-lg border border-border min-h-0 bg-black" 
                aria-label="Compressed video preview"
              />
              <Button onClick={download} variant="outline" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50" aria-label="Download compressed MP4">
                <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                <span>Download Compressed MP4</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                  <span>Ctrl</span><span>Shift</span><span>D</span>
                </kbd>
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center" role="status" aria-live="polite">
              {loading
                ? <div className="space-y-3 w-full max-w-xs" aria-live="polite">
                    <p>{stage}</p>
                    {progress > 0 && (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Compression progress">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs">{progress}%</p>
                      </>
                    )}
                  </div>
                : "Upload a video and click Compress to start"
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
