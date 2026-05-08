"use client"

import { useState, useRef } from "react"
import { Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

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
  const ffmpegRef = useRef<any>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setVideoUrl(URL.createObjectURL(f))
    setOutputUrl("")
    setError("")
    e.target.value = ""
  }

  const compress = async () => {
    if (!file) return
    setLoading(true); setProgress(0); setOutputUrl(""); setError("")

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
    } catch (err: any) {
      setError("Compression failed. Try a smaller file or different format.")
      console.error(err)
    }
    setLoading(false); setProgress(0); setStage("")
  }

  const download = () => {
    if (!outputUrl) return
    const name = (file?.name.replace(/\.[^.]+$/, "") || "compressed") + "-compressed.mp4"
    const a = Object.assign(document.createElement("a"), { href: outputUrl, download: name })
    a.click()
  }

  const savings = file && outputSize ? Math.round((1 - outputSize / file.size) * 100) : 0

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Video Compressor</h2>
          <p className="text-muted-foreground">Compress videos using ffmpeg.wasm. Runs entirely in your browser — no uploads.</p>
        </div>
        {outputUrl && <Button size="sm" onClick={download}><Download className="h-4 w-4 mr-1" />Download MP4</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs text-muted-foreground">Quality preset:</Label>
        {(Object.entries(PRESETS) as [Preset, typeof PRESETS[Preset]][]).map(([key, { label, hint }]) => (
          <button key={key} onClick={() => setPreset(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors text-left ${preset === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            <span className="font-medium">{label}</span>
            <span className="ml-1 opacity-70">— {hint}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Original{file ? ` — ${fmtBytes(file.size)}` : ""}</h3>
            <label className="cursor-pointer">
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
              <Button variant="ghost" size="sm" asChild>
                <span><Upload className="h-4 w-4 mr-1" />{file ? "Change" : "Upload"}</span>
              </Button>
            </label>
          </div>
          {videoUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              <video src={videoUrl} controls className="flex-1 w-full object-contain rounded-lg border border-border min-h-0 bg-black" />
              <Button onClick={compress} disabled={loading} className="shrink-0">
                {loading ? `${stage} ${progress > 0 ? progress + "%" : ""}` : "Compress Video"}
              </Button>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors">
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Click to upload a video</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV — up to a few hundred MB</p>
            </label>
          )}
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">
              {outputUrl ? `Compressed — ${fmtBytes(outputSize)}` : "Compressed Output"}
              {savings > 0 && <span className="ml-2 text-green-700 text-xs font-normal">-{savings}% smaller</span>}
            </h3>
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            </div>
          ) : outputUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              <video src={outputUrl} controls className="flex-1 w-full object-contain rounded-lg border border-border min-h-0 bg-black" />
              <Button onClick={download} variant="outline" className="shrink-0">
                <Download className="h-4 w-4 mr-1" />Download Compressed MP4
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              {loading
                ? <div className="space-y-3 w-full max-w-xs">
                    <p>{stage}</p>
                    {progress > 0 && (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
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
