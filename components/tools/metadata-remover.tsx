"use client"

import { useMemo, useState } from "react"
import exifr from "exifr"
import JSZip from "jszip"
import { Download, Shield, CheckCircle2, MapPin, Camera, Calendar, ArrowRight } from "lucide-react"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

type ParsedMetadata = {
  gps: string | null
  device: string | null
  date: string | null
}

type ProcessedFile = {
  name: string
  url: string
  blob: Blob
  originalName: string
  removedFields: string[]
}

type RemoveOptions = {
  gps: boolean
  device: boolean
  date: boolean
}

export function MetadataRemover() {
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [metadataByFile, setMetadataByFile] = useState<Record<string, ParsedMetadata>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [removeOptions, setRemoveOptions] = useState<RemoveOptions>({
    gps: true,
    device: true,
    date: true,
  })

  const keyForFile = (file: File) => `${file.name}-${file.lastModified}-${file.size}`

  const formatGps = (lat?: number, lon?: number) => {
    if (typeof lat !== "number" || typeof lon !== "number") return null
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
  }

  const formatDate = (value?: Date | string) => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString()
  }

  const parseMetadata = async (selectedFiles: File[]) => {
    const nextMetadata: Record<string, ParsedMetadata> = {}
    for (const file of selectedFiles) {
      const key = keyForFile(file)
      try {
        const data = await exifr.parse(file, [
          "Make", "Model", "DateTimeOriginal", "CreateDate", "ModifyDate", "latitude", "longitude",
        ])
        const deviceParts = [data?.Make, data?.Model].filter(Boolean)
        nextMetadata[key] = {
          gps: formatGps(data?.latitude, data?.longitude),
          device: deviceParts.length > 0 ? deviceParts.join(" ") : null,
          date: formatDate(data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate),
        }
      } catch {
        nextMetadata[key] = { gps: null, device: null, date: null }
      }
    }
    setMetadataByFile(nextMetadata)
  }

  const handleFilesSelected = async (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setProcessedFiles([])
    setErrors([])
    await parseMetadata(selectedFiles)
  }

  const outputTypeFromInput = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (file.type === "image/png" || ext === "png") return "image/png"
    return "image/jpeg"
  }

  const outputExtension = (mimeType: string) => (mimeType === "image/png" ? "png" : "jpg")

  const removeMetadata = async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setErrors([])
    const processed: ProcessedFile[] = []
    const nextErrors: string[] = []

    for (const file of files) {
      const sourceUrl = URL.createObjectURL(file)
      try {
        const bitmap = await createImageBitmap(file)
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          nextErrors.push(`Could not process ${file.name}: canvas context unavailable.`)
          bitmap.close()
          continue
        }
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()

        const outputMimeType = outputTypeFromInput(file)
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), outputMimeType, 0.95)
        })
        if (!blob) {
          nextErrors.push(`Could not process ${file.name}: failed to create output image.`)
          continue
        }

        const meta = metadataByFile[keyForFile(file)]
        const removedFields: string[] = []
        if (removeOptions.gps && meta?.gps) removedFields.push("GPS")
        if (removeOptions.device && meta?.device) removedFields.push("Device")
        if (removeOptions.date && meta?.date) removedFields.push("Date")

        const cleanExt = outputExtension(outputMimeType)
        processed.push({
          name: `${file.name.replace(/\.[^/.]+$/, "")}_clean.${cleanExt}`,
          url: URL.createObjectURL(blob),
          blob,
          originalName: file.name,
          removedFields,
        })
      } catch {
        nextErrors.push(`Could not process ${file.name}. This browser may not support decoding this format (common with HEIC).`)
      } finally {
        URL.revokeObjectURL(sourceUrl)
      }
    }

    setProcessedFiles(processed)
    setErrors(nextErrors)
    setIsProcessing(false)
  }

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
  }

  const downloadAllZip = async () => {
    if (processedFiles.length === 0) return
    const zip = new JSZip()
    processedFiles.forEach((file) => { zip.file(file.name, file.blob) })
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const zipUrl = URL.createObjectURL(zipBlob)
    downloadFile(zipUrl, "cleaned-images.zip")
    URL.revokeObjectURL(zipUrl)
  }

  const selectedCountLabel = useMemo(() => `${files.length} file${files.length > 1 ? "s" : ""}`, [files.length])
  const hasAnyMetadata = (meta: ParsedMetadata) => meta.gps || meta.device || meta.date
  const anyOptionSelected = removeOptions.gps || removeOptions.device || removeOptions.date

  const toggleOption = (key: keyof RemoveOptions) =>
    setRemoveOptions((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Metadata Remover</h2>
        <p className="text-muted-foreground">Remove EXIF data and other metadata from your images for privacy.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {/* LEFT */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Privacy Protection
              </CardTitle>
              <CardDescription>
                Strips GPS coordinates, camera info, timestamps, and other embedded data. Supports batch upload — up to 20 files at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileDropzone
                accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
                onFilesSelected={handleFilesSelected}
                maxFiles={20}
                multiple
              />

              {files.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{files.length} file{files.length > 1 ? "s" : ""} ready</span>
                  <button type="button" onClick={() => { setFiles([]); setProcessedFiles([]); setErrors([]) }} className="hover:text-destructive">
                    Clear all files
                  </button>
                </div>
              )}

              {/* Selective removal options */}
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs font-medium">Fields to remove</p>
                <div className="grid gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={removeOptions.gps} onCheckedChange={() => toggleOption("gps")} />
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    GPS Location
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={removeOptions.device} onCheckedChange={() => toggleOption("device")} />
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                    Device Info (Make & Model)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={removeOptions.date} onCheckedChange={() => toggleOption("date")} />
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Date & Time
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Canvas processing removes all EXIF. Unchecked fields are shown as retained in the diff view.
                </p>
              </div>

              {files.length > 0 && (
                <Button onClick={removeMetadata} disabled={isProcessing || !anyOptionSelected} className="w-full">
                  {isProcessing ? "Processing..." : `Remove Metadata from ${selectedCountLabel}`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected EXIF Metadata</CardTitle>
                <CardDescription>Preview of common fields found before cleanup.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {files.map((file, index) => {
                  const metadata = metadataByFile[keyForFile(file)]
                  const processed = processedFiles.find((p) => p.originalName === file.name)
                  const hadMetadata = metadata && hasAnyMetadata(metadata)

                  return (
                    <div key={`${file.name}-${index}`} className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        {processed && (
                          <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">Cleaned</span>
                        )}
                      </div>

                      <div className="grid gap-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          GPS: {metadata?.gps ?? "Not found"}
                          {processed && metadata?.gps && removeOptions.gps && (
                            <span className="flex items-center gap-1 text-green-500"><ArrowRight className="h-3 w-3" /> Removed</span>
                          )}
                          {processed && metadata?.gps && !removeOptions.gps && (
                            <span className="text-yellow-500">Kept</span>
                          )}
                        </p>
                        <p className="flex items-center gap-2">
                          <Camera className="h-3.5 w-3.5 shrink-0" />
                          Device: {metadata?.device ?? "Not found"}
                          {processed && metadata?.device && removeOptions.device && (
                            <span className="flex items-center gap-1 text-green-500"><ArrowRight className="h-3 w-3" /> Removed</span>
                          )}
                          {processed && metadata?.device && !removeOptions.device && (
                            <span className="text-yellow-500">Kept</span>
                          )}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Date: {metadata?.date ?? "Not found"}
                          {processed && metadata?.date && removeOptions.date && (
                            <span className="flex items-center gap-1 text-green-500"><ArrowRight className="h-3 w-3" /> Removed</span>
                          )}
                          {processed && metadata?.date && !removeOptions.date && (
                            <span className="text-yellow-500">Kept</span>
                          )}
                        </p>
                      </div>

                      {processed && !hadMetadata && (
                        <p className="text-xs text-muted-foreground">No metadata detected — file still cleaned.</p>
                      )}

                      {processed && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => downloadFile(processed.url, processed.name)}>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download {processed.name}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {processedFiles.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {processedFiles.length} files processed
                </CardTitle>
                <CardDescription>
                  All metadata removed. Download individually above or get all as ZIP.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={downloadAllZip}>
                  <Download className="mr-2 h-4 w-4" />
                  Download All as ZIP
                </Button>
              </CardContent>
            </Card>
          )}

          {errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Some files were not processed</CardTitle>
                <CardDescription>These files were skipped due to browser decoding limitations or file issues.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {errors.map((error, index) => <li key={index}>{error}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}