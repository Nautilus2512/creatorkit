"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Download, Music, X, FileAudio, Play, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

// ── Format definitions ────────────────────────────────────────────────────────
const NATIVE_FORMATS = [
  { value: "wav", label: "WAV", desc: "Lossless, instant" },
  { value: "mp3", label: "MP3", desc: "Compressed, instant" },
] as const

const FFMPEG_FORMATS = [
  { value: "ogg",  label: "OGG",  desc: "Open source" },
  { value: "flac", label: "FLAC", desc: "Lossless" },
  { value: "aac",  label: "AAC",  desc: "Apple/Android" },
  { value: "m4a",  label: "M4A",  desc: "Apple format" },
  { value: "wma",  label: "WMA",  desc: "Windows audio" },
  { value: "opus", label: "OPUS", desc: "Streaming" },
] as const

const ALL_FORMATS = [...NATIVE_FORMATS, ...FFMPEG_FORMATS]
type Format = typeof ALL_FORMATS[number]["value"]

const MIME: Record<string, string> = {
  wav: "audio/wav", mp3: "audio/mpeg", ogg: "audio/ogg",
  flac: "audio/flac", aac: "audio/aac", m4a: "audio/mp4",
  wma: "audio/x-ms-wma", opus: "audio/ogg",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}
function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`
}

// ── WAV encoder (pure JS, zero deps) ─────────────────────────────────────────
function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}
function audioBufferToWav(buf: AudioBuffer): Blob {
  const ch = Math.min(buf.numberOfChannels, 2)
  const sr = buf.sampleRate
  const len = buf.length
  const ab = new ArrayBuffer(44 + len * ch * 2)
  const v = new DataView(ab)
  writeStr(v, 0, "RIFF"); v.setUint32(4, 36 + len * ch * 2, true)
  writeStr(v, 8, "WAVE"); writeStr(v, 12, "fmt ")
  v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, ch, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true)
  v.setUint16(34, 16, true); writeStr(v, 36, "data")
  v.setUint32(40, len * ch * 2, true)
  let off = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]))
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2
    }
  }
  return new Blob([ab], { type: "audio/wav" })
}

// ── Float32 → Int16 for lamejs ────────────────────────────────────────────────
function toInt16(f32: Float32Array): Int16Array {
  const out = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AudioConverter() {
  const [activeTab, setActiveTab]     = useState<"input" | "output">("input")
  const [file, setFile]               = useState<File | null>(null)
  const [audioBuf, setAudioBuf]       = useState<AudioBuffer | null>(null)
  const [targetFormat, setTargetFormat] = useState<Format>("mp3")
  const [quality, setQuality]         = useState<"high" | "medium" | "low">("medium")
  const [isConverting, setIsConverting] = useState(false)
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false)
  const [progress, setProgress]       = useState(0)
  const [progressMsg, setProgressMsg] = useState("")
  const [result, setResult]           = useState<{ url: string; name: string; size: number; duration: number } | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const bitrate    = quality === "high" ? 320 : quality === "medium" ? 192 : 128
  const isNative   = NATIVE_FORMATS.some(f => f.value === targetFormat)
  const needsFFmpeg = !isNative

  // ── File loading ────────────────────────────────────────────────────────────
  const handleFile = async (f: File) => {
    const ok = f.type.startsWith("audio/") ||
      [".mp3",".wav",".ogg",".flac",".aac",".m4a",".wma",".opus"].some(e => f.name.toLowerCase().endsWith(e))
    if (!ok) { setError("Please upload an audio file."); return }
    setFile(f); setResult(null); setError(null); setAudioBuf(null)
    try {
      const ctx = new AudioContext()
      const decoded = await ctx.decodeAudioData(await f.arrayBuffer())
      await ctx.close()
      setAudioBuf(decoded)
    } catch { /* file will still convert via ffmpeg if needed */ }
  }

  // ── WAV (native) ────────────────────────────────────────────────────────────
  const convertToWav = async (): Promise<{ blob: Blob; duration: number }> => {
    if (!audioBuf) throw new Error("This file could not be decoded in the browser. Try a different format.")
    setProgressMsg("Writing WAV…"); setProgress(60)
    const blob = audioBufferToWav(audioBuf)
    setProgress(100)
    return { blob, duration: audioBuf.duration }
  }

  // ── MP3 via lamejs (native) ─────────────────────────────────────────────────
  const convertToMp3 = async (): Promise<{ blob: Blob; duration: number }> => {
    if (!audioBuf) throw new Error("This file could not be decoded in the browser. Try a different format.")
    setProgressMsg("Encoding MP3…")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { default: lamejs } = await import("lamejs") as any
    const ch  = Math.min(audioBuf.numberOfChannels, 2)
    const enc = new lamejs.Mp3Encoder(ch, audioBuf.sampleRate, bitrate)
    const chunks: Int8Array[] = []
    const block = 1152
    const L = audioBuf.getChannelData(0)
    const R = ch > 1 ? audioBuf.getChannelData(1) : L
    for (let i = 0; i < audioBuf.length; i += block) {
      const lc = toInt16(L.subarray(i, i + block))
      const rc = toInt16(R.subarray(i, i + block))
      const buf = ch > 1 ? enc.encodeBuffer(lc, rc) : enc.encodeBuffer(lc)
      if (buf.length > 0) chunks.push(buf)
      setProgress(Math.round((i / audioBuf.length) * 95))
    }
    const tail = enc.flush()
    if (tail.length > 0) chunks.push(tail)
    setProgress(100)
    return { blob: new Blob(chunks, { type: "audio/mpeg" }), duration: audioBuf.duration }
  }

  // ── ffmpeg fallback ─────────────────────────────────────────────────────────
  const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current
    setIsLoadingFFmpeg(true)
    setProgressMsg("Downloading ffmpeg (~25MB)…")
    const ff = new FFmpeg()
    const cdns = [
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
    ]
    for (const base of cdns) {
      try {
        await ff.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        })
        ffmpegRef.current = ff
        setIsLoadingFFmpeg(false)
        return ff
      } catch { /* try next CDN */ }
    }
    setIsLoadingFFmpeg(false)
    throw new Error("Failed to load ffmpeg. Check your internet connection and try again.")
  }

  const convertWithFfmpeg = async (): Promise<{ blob: Blob; duration: number }> => {
    const ff  = await loadFFmpeg()
    const ext = file!.name.split(".").pop() || "mp3"
    const inp = `input.${ext}`
    const out = `output.${targetFormat}`
    const dur = audioBuf?.duration ?? 0
    ff.on("log", ({ message }) => {
      const m = message.match(/time=(\d+):(\d+):(\d+\.\d+)/)
      if (m && dur > 0) {
        const t = +m[1] * 3600 + +m[2] * 60 + +m[3]
        setProgress(Math.min(99, Math.round((t / dur) * 100)))
      }
    })
    setProgressMsg(`Converting to ${targetFormat.toUpperCase()}…`)
    await ff.writeFile(inp, await fetchFile(file!))
    const qualArgs: Record<string, string[]> = {
      ogg:  ["-q:a",              quality === "high" ? "7" : quality === "medium" ? "5" : "3"],
      flac: ["-compression_level", quality === "high" ? "8" : quality === "medium" ? "5" : "2"],
    }
    await ff.exec(["-i", inp, ...(qualArgs[targetFormat] ?? ["-b:a", `${bitrate}k`]), "-y", out])
    const data = await ff.readFile(out)
    const blob = new Blob([data as BlobPart], { type: MIME[targetFormat] ?? `audio/${targetFormat}` })
    await ff.deleteFile(inp).catch(() => {})
    await ff.deleteFile(out).catch(() => {})
    setProgress(100)
    return { blob, duration: dur }
  }

  // ── Main convert ────────────────────────────────────────────────────────────
  const convert = useCallback(async () => {
    if (!file) return
    setIsConverting(true); setProgress(0); setError(null); setResult(null)
    try {
      const { blob, duration } =
        targetFormat === "wav" ? await convertToWav() :
        targetFormat === "mp3" ? await convertToMp3() :
        await convertWithFfmpeg()
      const url  = URL.createObjectURL(blob)
      const base = file.name.replace(/\.[^/.]+$/, "")
      setResult({ url, name: `${base}.${targetFormat}`, size: blob.size, duration })
      setActiveTab("output")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.")
    } finally {
      setIsConverting(false); setProgress(0); setProgressMsg("")
    }
  }, [file, targetFormat, quality, audioBuf])

  const download = () => {
    if (!result) return
    const a = document.createElement("a"); a.href = result.url; a.download = result.name; a.click()
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === "U") { e.preventDefault(); inputRef.current?.click(); return }
        if (e.key === "Enter") { e.preventDefault(); if (file && !isConverting && !isLoadingFFmpeg) convert(); return }
        if (e.key === "S") { e.preventDefault(); if (result) download(); return }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const n = parseInt(e.key)
        if (n >= 1 && n <= ALL_FORMATS.length) { e.preventDefault(); setTargetFormat(ALL_FORMATS[n - 1].value); return }
        if (e.key === "q" || e.key === "Q") {
          e.preventDefault()
          setQuality(q => q === "high" ? "medium" : q === "medium" ? "low" : "high")
        }
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [file, isConverting, isLoadingFFmpeg, result, convert])

  // ── Shared shortcuts list ───────────────────────────────────────────────────
  const shortcuts = [
    { keys: ["Ctrl", "Shift", "Enter"], description: "Convert audio" },
    { keys: ["Ctrl", "Shift", "U"],     description: "Upload file" },
    { keys: ["Ctrl", "Shift", "S"],     description: "Download result" },
    { keys: ["1", "–", "8"],            description: "Select format by number" },
    { keys: ["Q"],                      description: "Cycle quality: High, Medium, Low" },
    { keys: ["?"],                      description: "Toggle this shortcuts panel" },
  ]

  // ── Primary action button (reused desktop + mobile) ─────────────────────────
  const primaryBtn = (
    <Button
      className="h-11 md:h-auto w-full md:w-auto"
      onClick={result ? download : convert}
      disabled={result ? false : (!file || isConverting || isLoadingFFmpeg)}
      aria-label={result ? `Download ${result.name}` : "Convert audio"}
    >
      {isConverting || isLoadingFFmpeg ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{isLoadingFFmpeg ? "Downloading…" : "Converting…"}</>
      ) : result ? (
        <><Download className="mr-2 h-4 w-4" aria-hidden="true" />Download {targetFormat.toUpperCase()}</>
      ) : (
        <><Play className="mr-2 h-4 w-4" aria-hidden="true" />Convert
          <kbd className="ml-1.5 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Enter</kbd>
        </>
      )}
    </Button>
  )

  return (
    <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Audio Converter">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {result ? `Conversion complete. ${result.name} ready to download.` : ""}
      </div>

      {/* Desktop top bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Audio Converter</span>
        {needsFFmpeg && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>This format requires a ~25MB one-time download.</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Audio Converter" shortcuts={shortcuts} />
          {primaryBtn}
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Audio Converter</h2>
          <ShortcutsModal pageName="Audio Converter" shortcuts={shortcuts} />
        </div>
        {needsFFmpeg && (
          <div className="flex items-center gap-1.5 px-4 pb-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>This format requires a ~25MB one-time download.</span>
          </div>
        )}
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Result
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Left panel — settings */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Conversion settings">
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* File upload */}
              <div className="space-y-2" role="group" aria-labelledby="file-heading">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="file-heading">Audio File</Label>
                  <kbd className="hidden md:inline text-xs text-muted-foreground rounded border border-border bg-muted px-1.5 py-0.5" aria-hidden="true">Ctrl+Shift+U</kbd>
                </div>
                <div
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
                  role="button" tabIndex={0}
                  className="flex min-h-[80px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Upload audio file. Click or press Enter to browse."
                >
                  <input ref={inputRef} type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.wma,.opus"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    aria-hidden="true" />
                  {file ? (
                    <div className="flex items-center gap-3 px-4 w-full">
                      <FileAudio className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size)}{audioBuf ? ` · ${formatDuration(audioBuf.duration)}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setAudioBuf(null) }}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Remove file">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center px-4">
                      <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm font-medium">Drop a file or click to browse</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, OGG, FLAC, AAC, M4A, WMA, OPUS</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Format — instant */}
              <div className="space-y-3" role="group" aria-labelledby="format-heading">
                <Label className="text-sm font-medium" id="format-heading">Target Format</Label>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Instant — no download</p>
                  <div className="flex gap-2" role="radiogroup" aria-label="Instant formats">
                    {NATIVE_FORMATS.map((fmt, i) => (
                      <button key={fmt.value} onClick={() => setTargetFormat(fmt.value)}
                        className={`flex-1 rounded-lg border p-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${targetFormat === fmt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                        role="radio" aria-checked={targetFormat === fmt.value}
                        aria-label={`${fmt.label}: ${fmt.desc}. Press ${i + 1}.`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{fmt.label}</span>
                          <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono" aria-hidden="true">{i + 1}</kbd>
                        </div>
                        <div className="text-xs text-muted-foreground">{fmt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format — ffmpeg */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Requires ~25MB download</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Download-required formats">
                    {FFMPEG_FORMATS.map((fmt, i) => (
                      <button key={fmt.value} onClick={() => setTargetFormat(fmt.value)}
                        className={`rounded-lg border p-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${targetFormat === fmt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                        role="radio" aria-checked={targetFormat === fmt.value}
                        aria-label={`${fmt.label}: ${fmt.desc}. Press ${i + 3}.`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{fmt.label}</span>
                          <kbd className="hidden md:inline text-[10px] px-1 rounded bg-muted text-muted-foreground font-mono" aria-hidden="true">{i + 3}</kbd>
                        </div>
                        <div className="text-xs text-muted-foreground">{fmt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-2" role="group" aria-labelledby="quality-heading">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="quality-heading">Quality</Label>
                  <kbd className="hidden md:inline text-xs text-muted-foreground rounded border border-border bg-muted px-1.5 py-0.5" aria-hidden="true">Q to cycle</kbd>
                </div>
                <div className="flex gap-2" role="radiogroup" aria-labelledby="quality-heading">
                  {([
                    { value: "high",   label: "High",   desc: "320 kbps" },
                    { value: "medium", label: "Medium", desc: "192 kbps" },
                    { value: "low",    label: "Low",    desc: "128 kbps" },
                  ] as const).map(q => (
                    <button key={q.value} onClick={() => setQuality(q.value)}
                      className={`flex-1 rounded-lg border p-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary ${quality === q.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                      role="radio" aria-checked={quality === q.value}
                      aria-label={`${q.label} quality: ${q.desc}`}>
                      <div className="font-medium text-sm">{q.label}</div>
                      <div className="text-xs text-muted-foreground">{q.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {(isConverting || isLoadingFFmpeg) && (
                <div role="status" aria-live="polite">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{progressMsg}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2"
                    role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2" role="alert" aria-live="assertive">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — result */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 bg-card`} role="region" aria-label="Conversion result">
            <div className="flex-1 overflow-y-auto p-4">
              {!result ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <div className="rounded-full border border-border bg-muted/50 p-4">
                    <Music className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No result yet</p>
                    <p className="text-xs mt-0.5">Upload a file and click Convert</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">Conversion Complete</p>
                    </div>
                    <audio controls preload="auto" className="w-full"
                      aria-label={`Converted audio: ${result.name}`}>
                      <source src={result.url} type={MIME[targetFormat]} />
                    </audio>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Original</p>
                        <p className="text-sm font-semibold">{formatBytes(file?.size ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Converted</p>
                        <p className="text-sm font-semibold">{formatBytes(result.size)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                        <p className="text-sm font-semibold">{result.duration > 0 ? formatDuration(result.duration) : "—"}</p>
                      </div>
                    </div>
                    <Button className="w-full" onClick={download}
                      aria-label={`Download ${result.name}`}>
                      <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                      Download {result.name}
                      <kbd className="ml-1.5 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">How to use Audio Converter</h3>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Converting a file</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Upload an audio file by clicking the upload area or dragging a file onto it.</li>
              <li>Pick a <span className="text-foreground font-medium">Target Format</span>. WAV and MP3 convert instantly with no download required.</li>
              <li>Pick a <span className="text-foreground font-medium">Quality</span> level. Higher quality means a larger file size.</li>
              <li>Click <span className="text-foreground font-medium">Convert</span>. The result appears on the right with a playback player and a Download button.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Format guide</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <p><span className="text-foreground font-medium">WAV</span> — Uncompressed. Perfect quality. Best for editing in audio software.</p>
              <p><span className="text-foreground font-medium">MP3</span> — Compressed. Small file size with good quality. Best for music and podcasts.</p>
              <p><span className="text-foreground font-medium">OGG</span> — Open format, comparable to MP3. Requires one-time download.</p>
              <p><span className="text-foreground font-medium">FLAC</span> — Lossless compression. Smaller than WAV, perfect quality. Requires one-time download.</p>
              <p><span className="text-foreground font-medium">AAC / M4A</span> — Better quality than MP3 at the same bitrate. Requires one-time download.</p>
              <p><span className="text-foreground font-medium">OPUS</span> — Optimised for voice and streaming. Requires one-time download.</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>WAV and MP3 convert in seconds using your browser directly. No server involved.</li>
              <li>192 kbps MP3 sounds identical to 320 kbps for most listeners on standard speakers.</li>
              <li>The ~25MB download for other formats happens once and is cached by your browser.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* Mobile bottom bar — fixed */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {primaryBtn}
      </div>
    </div>
  )
}
