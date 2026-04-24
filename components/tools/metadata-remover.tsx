"use client"

import { useMemo, useState } from "react"
import exifr from "exifr"
import { Download, Shield, CheckCircle2, MapPin, Camera, Calendar } from "lucide-react"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ParsedMetadata = {
  gps: string | null
  device: string | null
  date: string | null
}

type ProcessedFile = {
  name: string
  url: string
}

export function MetadataRemover() {
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [metadataByFile, setMetadataByFile] = useState<Record<string, ParsedMetadata>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

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
          "Make",
          "Model",
          "DateTimeOriginal",
          "CreateDate",
          "ModifyDate",
          "latitude",
          "longitude",
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
          canvas.toBlob((nextBlob) => resolve(nextBlob), outputMimeType, 0.95)
        })

        if (!blob) {
          nextErrors.push(`Could not process ${file.name}: failed to create output image.`)
          continue
        }

        const cleanUrl = URL.createObjectURL(blob)
        const cleanExt = outputExtension(outputMimeType)
        processed.push({
          name: `${file.name.replace(/\.[^/.]+$/, "")}_clean.${cleanExt}`,
          url: cleanUrl,
        })
      } catch {
        nextErrors.push(
          `Could not process ${file.name}. This browser may not support decoding this format (common with HEIC).`
        )
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

  const downloadAll = () => {
    processedFiles.forEach((file) => {
      downloadFile(file.url, file.name)
    })
  }

  const selectedCountLabel = useMemo(() => {
    return `${files.length} file${files.length > 1 ? "s" : ""}`
  }, [files.length])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Metadata Remover
        </h2>
        <p className="text-muted-foreground">
          Remove EXIF data and other metadata from your images for privacy.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Privacy Protection
              </CardTitle>
              <CardDescription>
                Strips GPS coordinates, camera info, timestamps, and other embedded
                data from your images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileDropzone
                accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
                onFilesSelected={handleFilesSelected}
                maxFiles={20}
              />

              {files.length > 0 && (
                <Button
                  onClick={removeMetadata}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? "Processing..." : `Remove Metadata from ${selectedCountLabel}`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected EXIF Metadata</CardTitle>
                <CardDescription>
                  Preview of common fields found before cleanup.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {files.map((file, index) => {
                  const metadata = metadataByFile[keyForFile(file)]
                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <div className="grid gap-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          GPS: {metadata?.gps ?? "Not found"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Camera className="h-3.5 w-3.5" />
                          Device: {metadata?.device ?? "Not found"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          Date: {metadata?.date ?? "Not found"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {processedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Processed Files
                </CardTitle>
                <CardDescription>
                  Your files are ready to download. All metadata has been removed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  {processedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3"
                    >
                      <span className="truncate text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(file.url, file.name)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
                {processedFiles.length > 1 && (
                  <Button variant="outline" className="w-full" onClick={downloadAll}>
                    Download All
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Some files were not processed</CardTitle>
                <CardDescription>
                  These files were skipped due to browser decoding limitations or file issues.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
