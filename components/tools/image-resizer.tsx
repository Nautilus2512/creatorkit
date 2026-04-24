"use client"

import { useState } from "react"
import { Download, CheckCircle2 } from "lucide-react"
import JSZip from "jszip"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SOCIAL_PRESETS = [
  { key: "instagram-post", name: "Instagram Post", width: 1080, height: 1080 },
  { key: "instagram-story", name: "Instagram Story", width: 1080, height: 1920 },
  { key: "twitter-post", name: "Twitter/X Post", width: 1200, height: 675 },
  { key: "linkedin-post", name: "LinkedIn Post", width: 1200, height: 627 },
  { key: "youtube-thumbnail", name: "YouTube Thumbnail", width: 1280, height: 720 },
  { key: "facebook-post", name: "Facebook Post", width: 1200, height: 630 },
] as const

type ProcessedImage = {
  key: string
  name: string
  width: number
  height: number
  fileName: string
  url: string
  blob: Blob
}

export function ImageResizer() {
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFilesSelected = (selectedFiles: File[]) => {
    const firstFile = selectedFiles[0] ? [selectedFiles[0]] : []
    setFiles(firstFile)
    setProcessedFiles([])
  }

  const resizeImages = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    const processed: ProcessedImage[] = []

    const file = files[0]
    if (!file) {
      setIsProcessing(false)
      return
    }

    const sourceName = file.name.replace(/\.[^/.]+$/, "")
    const bitmap = await createImageBitmap(file)

    for (const preset of SOCIAL_PRESETS) {
      const canvas = document.createElement("canvas")
      canvas.width = preset.width
      canvas.height = preset.height
      const ctx = canvas.getContext("2d")

      if (!ctx) continue

      // Cover the target frame while preserving aspect ratio and center-cropping.
      const srcAspect = bitmap.width / bitmap.height
      const targetAspect = preset.width / preset.height

      let drawWidth = preset.width
      let drawHeight = preset.height
      let offsetX = 0
      let offsetY = 0

      if (srcAspect > targetAspect) {
        drawHeight = preset.height
        drawWidth = preset.height * srcAspect
        offsetX = (preset.width - drawWidth) / 2
      } else {
        drawWidth = preset.width
        drawHeight = preset.width / srcAspect
        offsetY = (preset.height - drawHeight) / 2
      }

      ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.92)
      })

      if (!blob) continue

      const fileName = `${sourceName}_${preset.key}.jpg`
      processed.push({
        key: preset.key,
        name: preset.name,
        width: preset.width,
        height: preset.height,
        fileName,
        url: URL.createObjectURL(blob),
        blob,
      })
    }

    bitmap.close()
    setProcessedFiles(processed)
    setIsProcessing(false)
  }

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
  }

  const downloadAll = async () => {
    if (processedFiles.length === 0) return

    const zip = new JSZip()
    processedFiles.forEach((file) => {
      zip.file(file.fileName, file.blob)
    })

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const zipUrl = URL.createObjectURL(zipBlob)
    downloadFile(zipUrl, "resized-social-images.zip")
    URL.revokeObjectURL(zipUrl)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Image Resizer</h2>
        <p className="text-muted-foreground">
          Resize your images to any custom dimension or use presets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Image</CardTitle>
          <CardDescription>
            Upload one image and we will generate all social media sizes in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone
            accept="image/*"
            onFilesSelected={handleFilesSelected}
            maxFiles={1}
            multiple={false}
          />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Sizes</CardTitle>
            <CardDescription>
              Auto-generate all predefined social media formats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {SOCIAL_PRESETS.map((preset) => (
                <div
                  key={preset.key}
                  className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {preset.width}x{preset.height}
                  </p>
                </div>
              ))}
            </div>
            <Button
              onClick={resizeImages}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? "Processing..." : "Generate All Sizes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {processedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Resized Images
            </CardTitle>
            <CardDescription>
              Preview and download each generated size.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {processedFiles.map((file, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.width}x{file.height}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file.url, file.fileName)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                  <img
                    src={file.url}
                    alt={`${file.name} preview`}
                    className="w-full rounded-md border border-border object-cover"
                  />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={downloadAll}>
              Download All as ZIP
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
