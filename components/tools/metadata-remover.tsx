"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import exifr from "exifr"
import JSZip from "jszip"
import { PDFDocument } from "pdf-lib"
import {
  Download, Shield, CheckCircle2, MapPin, Camera, Calendar,
  ArrowRight, FileText, Aperture, Clock, Cpu, Music, File
} from "lucide-react"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type FileCategory = "image" | "pdf" | "office" | "audio"
type ImageMeta = { gps: string | null; device: string | null; date: string | null; software: string | null; lens: string | null; exposure: string | null; iso: string | null }
type PdfMeta = { author: string | null; title: string | null; creator: string | null; producer: string | null; subject: string | null; keywords: string | null }
type OfficeMeta = { creator: string | null; lastModifiedBy: string | null; created: string | null; modified: string | null; company: string | null; description: string | null }
type AudioMeta = { title: string | null; artist: string | null; album: string | null; year: string | null; genre: string | null; comment: string | null; composer: string | null; coverArt: boolean }
type FileMeta = { category: FileCategory; image?: ImageMeta; pdf?: PdfMeta; office?: OfficeMeta; audio?: AudioMeta }
type ImageRemoveOptions = { gps: boolean; device: boolean; date: boolean; software: boolean; lens: boolean; exposure: boolean }
type PdfRemoveOptions = { author: boolean; title: boolean; creator: boolean; producer: boolean; subject: boolean; keywords: boolean }
type OfficeRemoveOptions = { creator: boolean; lastModifiedBy: boolean; dates: boolean; company: boolean; description: boolean }
type AudioRemoveOptions = { title: boolean; artist: boolean; album: boolean; year: boolean; genre: boolean; comment: boolean; composer: boolean; coverArt: boolean }
type ProcessedFile = { name: string; url: string; blob: Blob; originalName: string; category: FileCategory; removedFields: string[] }

const IMAGE_EXTS = ["jpg","jpeg","png","webp","tiff","tif","heic","bmp","gif"]
const PDF_EXTS = ["pdf"]
const OFFICE_EXTS = ["docx","xlsx","pptx","odt","ods","odp"]
const AUDIO_EXTS = ["mp3","flac","wav","ogg","m4a","aac","wma","aiff","aif"]
const ACCEPT_STRING = [...IMAGE_EXTS, ...PDF_EXTS, ...OFFICE_EXTS, ...AUDIO_EXTS].map(e => `.${e}`).join(",")

function getCategory(file: File): FileCategory {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (IMAGE_EXTS.includes(ext)) return "image"
  if (PDF_EXTS.includes(ext)) return "pdf"
  if (OFFICE_EXTS.includes(ext)) return "office"
  return "audio"
}

export function MetadataRemover() {
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [metaByFile, setMetaByFile] = useState<Record<string, FileMeta>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [imgOpts, setImgOpts] = useState<ImageRemoveOptions>({ gps: true, device: true, date: true, software: true, lens: true, exposure: false })
  const [pdfOpts, setPdfOpts] = useState<PdfRemoveOptions>({ author: true, title: true, creator: true, producer: true, subject: true, keywords: true })
  const [officeOpts, setOfficeOpts] = useState<OfficeRemoveOptions>({ creator: true, lastModifiedBy: true, dates: true, company: true, description: true })
  const [audioOpts, setAudioOpts] = useState<AudioRemoveOptions>({ title: false, artist: false, album: false, year: false, genre: false, comment: true, composer: false, coverArt: true })
  const uploadRef = useRef<HTMLInputElement>(null)

  const keyForFile = (file: File) => `${file.name}-${file.lastModified}-${file.size}`

  const parseImageMeta = async (file: File): Promise<ImageMeta> => {
    try {
      const data = await exifr.parse(file, { pick: ["Make","Model","DateTimeOriginal","CreateDate","ModifyDate","latitude","longitude","Software","LensModel","LensMake","ExposureTime","FNumber","ISO","ISOSpeedRatings"] })
      const deviceParts = [data?.Make, data?.Model].filter(Boolean)
      const lensParts = [data?.LensMake, data?.LensModel].filter(Boolean)
      const formatGps = (lat?: number, lon?: number) => typeof lat === "number" && typeof lon === "number" ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : null
      const formatDate = (v?: Date | string) => { if (!v) return null; const d = v instanceof Date ? v : new Date(v); return isNaN(d.getTime()) ? null : d.toLocaleString() }
      return {
        gps: formatGps(data?.latitude, data?.longitude),
        device: deviceParts.length > 0 ? deviceParts.join(" ") : null,
        date: formatDate(data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate),
        software: data?.Software ?? null,
        lens: lensParts.length > 0 ? lensParts.join(" ") : null,
        exposure: data?.ExposureTime ? `${data.ExposureTime}s f/${data.FNumber ?? "?"}` : null,
        iso: data?.ISO ? `ISO ${data.ISO}` : (data?.ISOSpeedRatings ? `ISO ${data.ISOSpeedRatings}` : null),
      }
    } catch { return { gps:null, device:null, date:null, software:null, lens:null, exposure:null, iso:null } }
  }

  const parsePdfMeta = async (file: File): Promise<PdfMeta> => {
    try {
      const buf = await file.arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      return { author: pdf.getAuthor() ?? null, title: pdf.getTitle() ?? null, creator: pdf.getCreator() ?? null, producer: pdf.getProducer() ?? null, subject: pdf.getSubject() ?? null, keywords: pdf.getKeywords() ?? null }
    } catch { return { author:null, title:null, creator:null, producer:null, subject:null, keywords:null } }
  }

  const parseOfficeMeta = async (file: File): Promise<OfficeMeta> => {
    try {
      const buf = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(buf)
      const coreXml = await zip.file("docProps/core.xml")?.async("string")
      if (!coreXml) return { creator:null, lastModifiedBy:null, created:null, modified:null, company:null, description:null }
      const get = (tag: string) => coreXml.match(new RegExp(`<[^>]*:?${tag}[^>]*>([^<]*)<`))?.[1] ?? null
      const appXml = await zip.file("docProps/app.xml")?.async("string")
      const company = appXml?.match(/<Company>([^<]*)</)?.[1] ?? null
      return { creator: get("creator"), lastModifiedBy: get("lastModifiedBy"), created: get("created"), modified: get("modified"), company, description: get("description") }
    } catch { return { creator:null, lastModifiedBy:null, created:null, modified:null, company:null, description:null } }
  }

  const parseAudioMeta = async (file: File): Promise<AudioMeta> => {
    try {
      const { parseBlob } = await import("music-metadata")
      const meta = await parseBlob(file)
      const t = meta.common
      return {
        title: t.title ?? null, artist: t.artist ?? null, album: t.album ?? null,
        year: t.year ? String(t.year) : null, genre: t.genre?.join(", ") ?? null,
        comment: (t.comment as string[] | undefined)?.[0] ?? null,
        composer: t.composer?.join(", ") ?? null, coverArt: (t.picture?.length ?? 0) > 0,
      }
    } catch { return { title:null, artist:null, album:null, year:null, genre:null, comment:null, composer:null, coverArt:false } }
  }

  const parseMetadata = async (selectedFiles: File[]) => {
    const next: Record<string, FileMeta> = {}
    for (const file of selectedFiles) {
      const key = keyForFile(file)
      const cat = getCategory(file)
      if (cat === "image") next[key] = { category: "image", image: await parseImageMeta(file) }
      else if (cat === "pdf") next[key] = { category: "pdf", pdf: await parsePdfMeta(file) }
      else if (cat === "office") next[key] = { category: "office", office: await parseOfficeMeta(file) }
      else next[key] = { category: "audio", audio: await parseAudioMeta(file) }
    }
    setMetaByFile(next)
  }

  const processImage = async (file: File): Promise<{ blob: Blob; removed: string[] } | null> => {
    const bmp = await createImageBitmap(file)
    const canvas = document.createElement("canvas")
    canvas.width = bmp.width; canvas.height = bmp.height
    const ctx = canvas.getContext("2d")
    if (!ctx) { bmp.close(); return null }
    ctx.drawImage(bmp, 0, 0); bmp.close()
    const ext = file.name.split(".").pop()?.toLowerCase()
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, mime, 0.95))
    if (!blob) return null
    const m = metaByFile[keyForFile(file)]?.image
    const removed: string[] = []
    if (imgOpts.gps && m?.gps) removed.push("GPS")
    if (imgOpts.device && m?.device) removed.push("Device")
    if (imgOpts.date && m?.date) removed.push("Date")
    if (imgOpts.software && m?.software) removed.push("Software")
    if (imgOpts.lens && m?.lens) removed.push("Lens")
    if (imgOpts.exposure && m?.exposure) removed.push("Exposure/ISO")
    return { blob, removed }
  }

  const processPdf = async (file: File): Promise<{ blob: Blob; removed: string[] } | null> => {
    const buf = await file.arrayBuffer()
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
    const removed: string[] = []
    if (pdfOpts.author && pdf.getAuthor()) { pdf.setAuthor(""); removed.push("Author") }
    if (pdfOpts.title && pdf.getTitle()) { pdf.setTitle(""); removed.push("Title") }
    if (pdfOpts.creator && pdf.getCreator()) { pdf.setCreator(""); removed.push("Creator") }
    if (pdfOpts.producer && pdf.getProducer()) { pdf.setProducer(""); removed.push("Producer") }
    if (pdfOpts.subject && pdf.getSubject()) { pdf.setSubject(""); removed.push("Subject") }
    if (pdfOpts.keywords && pdf.getKeywords()) { pdf.setKeywords([]); removed.push("Keywords") }
    const bytes = await pdf.save()
    const buffer = bytes.buffer as unknown as ArrayBuffer
    return { blob: new Blob([buffer], { type: "application/pdf" }), removed }
  }

  const processOffice = async (file: File): Promise<{ blob: Blob; removed: string[] } | null> => {
    const buf = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buf)
    const removed: string[] = []
    const stripCore = (xml: string) => {
      let out = xml
      const strip = (tag: string, label: string, enabled: boolean) => {
        if (!enabled) return
        const before = out
        out = out.replace(new RegExp(`<[^>]*:?${tag}[^>]*>[^<]*</[^>]*:?${tag}>`, "g"), "")
        if (out !== before) removed.push(label)
      }
      strip("creator", "Creator", officeOpts.creator)
      strip("lastModifiedBy", "Last Modified By", officeOpts.lastModifiedBy)
      strip("created", "Created Date", officeOpts.dates)
      strip("modified", "Modified Date", officeOpts.dates)
      strip("description", "Description", officeOpts.description)
      return out
    }
    const coreFile = zip.file("docProps/core.xml")
    if (coreFile) { const xml = await coreFile.async("string"); zip.file("docProps/core.xml", stripCore(xml)) }
    if (officeOpts.company) {
      const appFile = zip.file("docProps/app.xml")
      if (appFile) {
        const xml = await appFile.async("string")
        const stripped = xml.replace(/<Company>[^<]*<\/Company>/, "<Company></Company>")
        if (stripped !== xml) removed.push("Company")
        zip.file("docProps/app.xml", stripped)
      }
    }
    const blob = await zip.generateAsync({ type: "blob" })
    return { blob, removed }
  }

  const processAudio = async (file: File): Promise<{ blob: Blob; removed: string[] } | null> => {
    const m = metaByFile[keyForFile(file)]?.audio
    const removed: string[] = []
    if (audioOpts.title && m?.title) removed.push("Title")
    if (audioOpts.artist && m?.artist) removed.push("Artist")
    if (audioOpts.album && m?.album) removed.push("Album")
    if (audioOpts.year && m?.year) removed.push("Year")
    if (audioOpts.genre && m?.genre) removed.push("Genre")
    if (audioOpts.comment && m?.comment) removed.push("Comment")
    if (audioOpts.composer && m?.composer) removed.push("Composer")
    if (audioOpts.coverArt && m?.coverArt) removed.push("Cover Art")
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
    return { blob, removed }
  }

  const handleFilesSelected = async (selectedFiles: File[]) => {
    setFiles(selectedFiles); setProcessedFiles([]); setErrors([])
    await parseMetadata(selectedFiles)
  }

  const removeMetadata = async () => {
    if (!files.length) return
    setIsProcessing(true); setErrors([])
    const processed: ProcessedFile[] = []
    const nextErrors: string[] = []
    for (const file of files) {
      try {
        const cat = getCategory(file)
        const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
        const baseName = file.name.replace(/\.[^/.]+$/, "")
        let result: { blob: Blob; removed: string[] } | null = null
        let outExt = ext
        if (cat === "image") { result = await processImage(file); outExt = ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg" }
        else if (cat === "pdf") result = await processPdf(file)
        else if (cat === "office") result = await processOffice(file)
        else result = await processAudio(file)
        if (!result) { nextErrors.push(`Could not process ${file.name}.`); continue }
        processed.push({ name: `${baseName}_clean.${outExt}`, url: URL.createObjectURL(result.blob), blob: result.blob, originalName: file.name, category: cat, removedFields: result.removed })
      } catch (e) { nextErrors.push(`Could not process ${file.name}: ${e instanceof Error ? e.message : "unknown error"}`) }
    }
    setProcessedFiles(processed); setErrors(nextErrors); setIsProcessing(false)
  }

  const downloadFile = (url: string, name: string) => { const a = document.createElement("a"); a.href = url; a.download = name; a.click() }

  const downloadAllZip = async () => {
    const zip = new JSZip()
    processedFiles.forEach(f => zip.file(f.name, f.blob))
    const blob = await zip.generateAsync({ type: "blob" })
    downloadFile(URL.createObjectURL(blob), "cleaned-files.zip")
  }

  const exportReport = () => {
    const rows = ["File,Category,Field,Value"]
    files.forEach(file => {
      const m = metaByFile[keyForFile(file)]
      if (!m) return
      const add = (field: string, value: string | null | boolean) => {
        if (value !== null && value !== false && value !== "") rows.push(`"${file.name}","${m.category}","${field}","${String(value).replace(/"/g,'""')}"`)
      }
      if (m.image) { add("GPS", m.image.gps); add("Device", m.image.device); add("Date", m.image.date); add("Software", m.image.software); add("Lens", m.image.lens); add("Exposure", m.image.exposure); add("ISO", m.image.iso) }
      if (m.pdf) { add("Author", m.pdf.author); add("Title", m.pdf.title); add("Creator", m.pdf.creator); add("Producer", m.pdf.producer); add("Subject", m.pdf.subject); add("Keywords", m.pdf.keywords) }
      if (m.office) { add("Creator", m.office.creator); add("Last Modified By", m.office.lastModifiedBy); add("Created", m.office.created); add("Modified", m.office.modified); add("Company", m.office.company); add("Description", m.office.description) }
      if (m.audio) { add("Title", m.audio.title); add("Artist", m.audio.artist); add("Album", m.audio.album); add("Year", m.audio.year); add("Genre", m.audio.genre); add("Comment", m.audio.comment); add("Composer", m.audio.composer); add("Cover Art", m.audio.coverArt ? "Yes" : null) }
    })
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    downloadFile(URL.createObjectURL(blob), "metadata-report.csv")
  }

  const byCategory = useMemo(() => ({
    image: files.filter(f => getCategory(f) === "image"),
    pdf: files.filter(f => getCategory(f) === "pdf"),
    office: files.filter(f => getCategory(f) === "office"),
    audio: files.filter(f => getCategory(f) === "audio"),
  }), [files])

  const selectedCountLabel = `${files.length} file${files.length !== 1 ? "s" : ""}`
  const toggleImg = (k: keyof ImageRemoveOptions) => setImgOpts(p => ({ ...p, [k]: !p[k] }))
  const togglePdf = (k: keyof PdfRemoveOptions) => setPdfOpts(p => ({ ...p, [k]: !p[k] }))
  const toggleOffice = (k: keyof OfficeRemoveOptions) => setOfficeOpts(p => ({ ...p, [k]: !p[k] }))
  const toggleAudio = (k: keyof AudioRemoveOptions) => setAudioOpts(p => ({ ...p, [k]: !p[k] }))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === "Enter") { e.preventDefault(); if (!isProcessing && files.length > 0) removeMetadata() }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); if (processedFiles.length > 0) downloadAllZip() }
      if (e.key === "e" || e.key === "E") { e.preventDefault(); if (Object.keys(metaByFile).length > 0) exportReport() }
      if (e.key === "o" || e.key === "O") { e.preventDefault(); uploadRef.current?.click() }
      if (e.key === "Backspace") { e.preventDefault(); if (files.length > 0) { setFiles([]); setProcessedFiles([]); setErrors([]) } }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isProcessing, files, processedFiles, metaByFile])

  const CheckRow = ({ checked, onChange, icon, label }: { checked: boolean; onChange: () => void; icon?: React.ReactNode; label: string }) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} />{icon}{label}
    </label>
  )

  const metaVal = (v: string | null | boolean | undefined) => {
    if (v === null || v === undefined) return "Not found"
    if (typeof v === "boolean") return v ? "Yes" : "No"
    return v
  }

  const DiffRow = ({ label, value, removed, kept }: { label: string; value: string | null | boolean | undefined; removed: boolean; kept: boolean }) => (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <span className="w-24 shrink-0">{label}:</span>
      <span className="truncate flex-1">{metaVal(value)}</span>
      {removed && !!value && <span className="flex shrink-0 items-center gap-1 text-green-500"><ArrowRight className="h-3 w-3" />Removed</span>}
      {kept && !!value && <span className="shrink-0 text-yellow-500">Kept</span>}
    </p>
  )

  return (
    <>
      <div className="flex h-full flex-col space-y-3">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Metadata Remover</h2>
          <p className="text-muted-foreground">Remove metadata from images, PDFs, Office documents, and audio files. 100% client-side.</p>
        </div>

        {/* Split Panel — desktop: side by side fixed height, mobile: stack */}
        <div className="grid gap-4 md:grid-cols-2 md:h-[calc(100vh-13rem)]">

          {/* LEFT PANEL — scrollable */}
          <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
            {/* Panel Header */}
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Privacy Protection</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>Image: JPG, PNG, WEBP, TIFF, HEIC, BMP, GIF</span>
                <span>Document: PDF, DOCX, XLSX, PPTX</span>
                <span>Audio: MP3 · FLAC, WAV coming soon</span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <FileDropzone ref={uploadRef} accept={ACCEPT_STRING} onFilesSelected={handleFilesSelected} maxFiles={20} multiple />

              {files.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex gap-3">
                    {byCategory.image.length > 0 && <span>{byCategory.image.length} image{byCategory.image.length > 1 ? "s" : ""}</span>}
                    {byCategory.pdf.length > 0 && <span>{byCategory.pdf.length} PDF{byCategory.pdf.length > 1 ? "s" : ""}</span>}
                    {byCategory.office.length > 0 && <span>{byCategory.office.length} doc{byCategory.office.length > 1 ? "s" : ""}</span>}
                    {byCategory.audio.length > 0 && <span>{byCategory.audio.length} audio</span>}
                  </span>
                  <button type="button" onClick={() => { setFiles([]); setProcessedFiles([]); setErrors([]) }} className="hover:text-destructive">Clear all</button>
                </div>
              )}

              {byCategory.image.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Image EXIF Fields</p>
                  <div className="grid gap-1.5">
                    <CheckRow checked={imgOpts.gps} onChange={() => toggleImg("gps")} icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />} label="GPS Location" />
                    <CheckRow checked={imgOpts.device} onChange={() => toggleImg("device")} icon={<Camera className="h-3.5 w-3.5 text-muted-foreground" />} label="Device (Make & Model)" />
                    <CheckRow checked={imgOpts.date} onChange={() => toggleImg("date")} icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />} label="Date & Time" />
                    <CheckRow checked={imgOpts.software} onChange={() => toggleImg("software")} icon={<Cpu className="h-3.5 w-3.5 text-muted-foreground" />} label="Software" />
                    <CheckRow checked={imgOpts.lens} onChange={() => toggleImg("lens")} icon={<Aperture className="h-3.5 w-3.5 text-muted-foreground" />} label="Lens Info" />
                    <CheckRow checked={imgOpts.exposure} onChange={() => toggleImg("exposure")} icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />} label="Exposure & ISO" />
                  </div>
                </div>
              )}

              {byCategory.pdf.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> PDF Metadata Fields</p>
                  <div className="grid gap-1.5">
                    <CheckRow checked={pdfOpts.author} onChange={() => togglePdf("author")} label="Author" />
                    <CheckRow checked={pdfOpts.title} onChange={() => togglePdf("title")} label="Title" />
                    <CheckRow checked={pdfOpts.creator} onChange={() => togglePdf("creator")} label="Creator (software)" />
                    <CheckRow checked={pdfOpts.producer} onChange={() => togglePdf("producer")} label="Producer (library)" />
                    <CheckRow checked={pdfOpts.subject} onChange={() => togglePdf("subject")} label="Subject" />
                    <CheckRow checked={pdfOpts.keywords} onChange={() => togglePdf("keywords")} label="Keywords" />
                  </div>
                </div>
              )}

              {byCategory.office.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium flex items-center gap-1"><File className="h-3.5 w-3.5" /> Office Document Fields</p>
                  <div className="grid gap-1.5">
                    <CheckRow checked={officeOpts.creator} onChange={() => toggleOffice("creator")} label="Creator / Author" />
                    <CheckRow checked={officeOpts.lastModifiedBy} onChange={() => toggleOffice("lastModifiedBy")} label="Last Modified By" />
                    <CheckRow checked={officeOpts.dates} onChange={() => toggleOffice("dates")} label="Created & Modified Dates" />
                    <CheckRow checked={officeOpts.company} onChange={() => toggleOffice("company")} label="Company" />
                    <CheckRow checked={officeOpts.description} onChange={() => toggleOffice("description")} label="Description" />
                  </div>
                </div>
              )}

              {byCategory.audio.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium flex items-center gap-1"><Music className="h-3.5 w-3.5" /> Audio Tag Fields</p>
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <p>🔄 <strong>FLAC, WAV, OGG, M4A, AAC, WMA, AIFF</strong> — preview only, removal coming soon</p>
                  </div>
                  <div className="grid gap-1.5">
                    <CheckRow checked={audioOpts.title} onChange={() => toggleAudio("title")} label="Title" />
                    <CheckRow checked={audioOpts.artist} onChange={() => toggleAudio("artist")} label="Artist" />
                    <CheckRow checked={audioOpts.album} onChange={() => toggleAudio("album")} label="Album" />
                    <CheckRow checked={audioOpts.year} onChange={() => toggleAudio("year")} label="Year" />
                    <CheckRow checked={audioOpts.genre} onChange={() => toggleAudio("genre")} label="Genre" />
                    <CheckRow checked={audioOpts.comment} onChange={() => toggleAudio("comment")} label="Comment" />
                    <CheckRow checked={audioOpts.composer} onChange={() => toggleAudio("composer")} label="Composer" />
                    <CheckRow checked={audioOpts.coverArt} onChange={() => toggleAudio("coverArt")} label="Cover Art" />
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Bar — always visible at bottom of left panel */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
              {files.length > 0 ? (
                <div className="flex gap-2">
                  <Button onClick={removeMetadata} disabled={isProcessing} className="flex-1">
                    {isProcessing ? "Processing..." : (
                      <span className="flex items-center justify-between w-full">
                        <span>Clean {selectedCountLabel}</span>
                        <kbd className="ml-2 rounded border border-primary-foreground/30 px-1 text-[10px] opacity-50">Ctrl+Enter</kbd>
                      </span>
                    )}
                  </Button>
                  <Button variant="outline" onClick={exportReport} disabled={Object.keys(metaByFile).length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>CSV</span>
                    <kbd className="ml-2 rounded border border-border px-1 text-[10px] opacity-50">Ctrl+E</kbd>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">Upload files to get started</p>
              )}
            </div>
          </div>

          {/* RIGHT PANEL — scrollable */}
          <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
            {/* Panel Header */}
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Detected Metadata</span>
              <p className="text-xs text-muted-foreground">Preview of fields found before cleanup.</p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {files.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Upload files on the left to see metadata here.</p>
                </div>
              )}

              {files.map((file, idx) => {
                const m = metaByFile[keyForFile(file)]
                const p = processedFiles.find(x => x.originalName === file.name)
                const cat = getCategory(file)
                return (
                  <div key={`${file.name}-${idx}`} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      {p && <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">Cleaned</span>}
                    </div>
                    {cat === "image" && m?.image && (
                      <div className="grid gap-0.5">
                        <DiffRow label="GPS" value={m.image.gps} removed={!!p && imgOpts.gps} kept={!!p && !imgOpts.gps} />
                        <DiffRow label="Device" value={m.image.device} removed={!!p && imgOpts.device} kept={!!p && !imgOpts.device} />
                        <DiffRow label="Date" value={m.image.date} removed={!!p && imgOpts.date} kept={!!p && !imgOpts.date} />
                        <DiffRow label="Software" value={m.image.software} removed={!!p && imgOpts.software} kept={!!p && !imgOpts.software} />
                        <DiffRow label="Lens" value={m.image.lens} removed={!!p && imgOpts.lens} kept={!!p && !imgOpts.lens} />
                        <DiffRow label="Exposure" value={m.image.exposure} removed={!!p && imgOpts.exposure} kept={!!p && !imgOpts.exposure} />
                        <DiffRow label="ISO" value={m.image.iso} removed={!!p && imgOpts.exposure} kept={!!p && !imgOpts.exposure} />
                      </div>
                    )}
                    {cat === "pdf" && m?.pdf && (
                      <div className="grid gap-0.5">
                        <DiffRow label="Author" value={m.pdf.author} removed={!!p && pdfOpts.author} kept={!!p && !pdfOpts.author} />
                        <DiffRow label="Title" value={m.pdf.title} removed={!!p && pdfOpts.title} kept={!!p && !pdfOpts.title} />
                        <DiffRow label="Creator" value={m.pdf.creator} removed={!!p && pdfOpts.creator} kept={!!p && !pdfOpts.creator} />
                        <DiffRow label="Producer" value={m.pdf.producer} removed={!!p && pdfOpts.producer} kept={!!p && !pdfOpts.producer} />
                        <DiffRow label="Subject" value={m.pdf.subject} removed={!!p && pdfOpts.subject} kept={!!p && !pdfOpts.subject} />
                        <DiffRow label="Keywords" value={m.pdf.keywords} removed={!!p && pdfOpts.keywords} kept={!!p && !pdfOpts.keywords} />
                      </div>
                    )}
                    {cat === "office" && m?.office && (
                      <div className="grid gap-0.5">
                        <DiffRow label="Creator" value={m.office.creator} removed={!!p && officeOpts.creator} kept={!!p && !officeOpts.creator} />
                        <DiffRow label="Modified By" value={m.office.lastModifiedBy} removed={!!p && officeOpts.lastModifiedBy} kept={!!p && !officeOpts.lastModifiedBy} />
                        <DiffRow label="Created" value={m.office.created} removed={!!p && officeOpts.dates} kept={!!p && !officeOpts.dates} />
                        <DiffRow label="Modified" value={m.office.modified} removed={!!p && officeOpts.dates} kept={!!p && !officeOpts.dates} />
                        <DiffRow label="Company" value={m.office.company} removed={!!p && officeOpts.company} kept={!!p && !officeOpts.company} />
                        <DiffRow label="Description" value={m.office.description} removed={!!p && officeOpts.description} kept={!!p && !officeOpts.description} />
                      </div>
                    )}
                    {cat === "audio" && m?.audio && (
                      <div className="grid gap-0.5">
                        <DiffRow label="Title" value={m.audio.title} removed={!!p && audioOpts.title} kept={!!p && !audioOpts.title} />
                        <DiffRow label="Artist" value={m.audio.artist} removed={!!p && audioOpts.artist} kept={!!p && !audioOpts.artist} />
                        <DiffRow label="Album" value={m.audio.album} removed={!!p && audioOpts.album} kept={!!p && !audioOpts.album} />
                        <DiffRow label="Year" value={m.audio.year} removed={!!p && audioOpts.year} kept={!!p && !audioOpts.year} />
                        <DiffRow label="Genre" value={m.audio.genre} removed={!!p && audioOpts.genre} kept={!!p && !audioOpts.genre} />
                        <DiffRow label="Comment" value={m.audio.comment} removed={!!p && audioOpts.comment} kept={!!p && !audioOpts.comment} />
                        <DiffRow label="Composer" value={m.audio.composer} removed={!!p && audioOpts.composer} kept={!!p && !audioOpts.composer} />
                        <DiffRow label="Cover Art" value={m.audio.coverArt} removed={!!p && audioOpts.coverArt} kept={!!p && !audioOpts.coverArt} />
                      </div>
                    )}
                    {p && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => downloadFile(p.url, p.name)}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Download {p.name}
                      </Button>
                    )}
                  </div>
                )
              })}

              {errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Processing Issues</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Sticky Action Bar — right panel bottom */}
            {processedFiles.length > 0 && (
              <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    {processedFiles.length} file{processedFiles.length > 1 ? "s" : ""} cleaned
                  </span>
                  <Button variant="outline" size="sm" onClick={downloadAllZip}>
                    <Download className="mr-2 h-3.5 w-3.5" /> Download ZIP
                    <kbd className="ml-2 rounded border border-border px-1 text-[10px] opacity-50">Ctrl+D</kbd>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShortcutsModal
        pageName="Metadata Remover"
        shortcuts={[
          { keys: ["Ctrl", "O"], description: "Open file upload" },
          { keys: ["Ctrl", "Enter"], description: "Clean all files" },
          { keys: ["Ctrl", "D"], description: "Download all as ZIP" },
          { keys: ["Ctrl", "E"], description: "Export metadata as CSV" },
          { keys: ["Ctrl", "Backspace"], description: "Clear all files" },
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}