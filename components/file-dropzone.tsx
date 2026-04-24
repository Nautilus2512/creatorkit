"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileDropzoneProps {
  accept?: string
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
}

export function FileDropzone({
  accept = "image/*",
  multiple = true,
  onFilesSelected,
  maxFiles = 10,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files).slice(0, maxFiles)
      setFiles(droppedFiles)
      onFilesSelected(droppedFiles)
    },
    [maxFiles, onFilesSelected]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files).slice(0, maxFiles)
        setFiles(selectedFiles)
        onFilesSelected(selectedFiles)
      }
    },
    [maxFiles, onFilesSelected]
  )

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index)
      setFiles(newFiles)
      onFilesSelected(newFiles)
    },
    [files, onFilesSelected]
  )

  const clearFiles = useCallback(() => {
    setFiles([])
    onFilesSelected([])
  }, [onFilesSelected])

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Drag and drop your files here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse • Max {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
            <Button variant="ghost" size="sm" onClick={clearFiles}>
              Clear all
            </Button>
          </div>
          <div className="grid gap-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="rounded-md bg-muted p-2">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
