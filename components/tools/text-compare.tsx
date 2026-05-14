"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  GitCompare, FileText, Upload, Download, Copy, Check,
  ArrowRightLeft, Eye, EyeOff, Search, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Diff algorithm implementation
interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'context'
  content: string
  lineNumber: number
  originalLineNumber?: number
}

interface DiffResult {
  leftLines: DiffLine[]
  rightLines: DiffLine[]
  stats: {
    additions: number
    deletions: number
    unchanged: number
  }
}

const computeDiff = (leftText: string, rightText: string): DiffResult => {
  const leftLines = leftText.split('\n')
  const rightLines = rightText.split('\n')

  const result: DiffResult = {
    leftLines: [],
    rightLines: [],
    stats: { additions: 0, deletions: 0, unchanged: 0 }
  }

  // Simple diff implementation
  const matrix: number[][] = Array(leftLines.length + 1).fill(null).map(() =>
    Array(rightLines.length + 1).fill(0)
  )

  // Build LCS matrix
  for (let i = 1; i <= leftLines.length; i++) {
    for (let j = 1; j <= rightLines.length; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1])
      }
    }
  }

  // Backtrack to get diff
  let i = leftLines.length
  let j = rightLines.length
  let leftLineNum = 0
  let rightLineNum = 0

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      result.leftLines.unshift({
        type: 'unchanged',
        content: leftLines[i - 1],
        lineNumber: leftLineNum++,
        originalLineNumber: i - 1
      })
      result.rightLines.unshift({
        type: 'unchanged',
        content: rightLines[j - 1],
        lineNumber: rightLineNum++,
        originalLineNumber: j - 1
      })
      result.stats.unchanged++
      i--
      j--
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      result.rightLines.unshift({
        type: 'added',
        content: rightLines[j - 1],
        lineNumber: rightLineNum++,
        originalLineNumber: j - 1
      })
      result.stats.additions++
      j--
    } else if (i > 0) {
      result.leftLines.unshift({
        type: 'removed',
        content: leftLines[i - 1],
        lineNumber: leftLineNum++,
        originalLineNumber: i - 1
      })
      result.stats.deletions++
      i--
    }
  }

  return result
}

export function TextCompare() {
  const [leftText, setLeftText] = useState("")
  const [rightText, setRightText] = useState("")
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [showWhitespace, setShowWhitespace] = useState(true)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const leftFileRef = useRef<HTMLInputElement>(null)
  const rightFileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const computeDiffWithSettings = () => {
    let processedLeft = leftText
    let processedRight = rightText

    if (ignoreCase) {
      processedLeft = processedLeft.toLowerCase()
      processedRight = processedRight.toLowerCase()
    }

    if (ignoreWhitespace) {
      processedLeft = processedLeft.replace(/\s+/g, ' ').trim()
      processedRight = processedRight.replace(/\s+/g, ' ').trim()
    }

    const result = computeDiff(processedLeft, processedRight)
    setDiffResult(result)
  }

  useEffect(() => {
    if (leftText || rightText) {
      computeDiffWithSettings()
    } else {
      setDiffResult(null)
    }
  }, [leftText, rightText, ignoreCase, ignoreWhitespace])

  const handleFileUpload = (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (side === 'left') {
        setLeftText(content)
      } else {
        setRightText(content)
      }
    }
    reader.readAsText(file)
  }

  const copyDiff = useCallback(async () => {
    if (!diffResult) return

    let diffText = "--- Original\n+++ Modified\n"
    diffResult.leftLines.forEach((line) => {
      if (line.type === 'removed') {
        diffText += `-${line.content}\n`
      } else if (line.type === 'unchanged') {
        diffText += ` ${line.content}\n`
      }
    })
    diffResult.rightLines.forEach((line) => {
      if (line.type === 'added') {
        diffText += `+${line.content}\n`
      }
    })

    await navigator.clipboard.writeText(diffText)
    setCopied(true)
    announceToScreenReader("Diff copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [diffResult, announceToScreenReader])

  const downloadDiff = useCallback(() => {
    if (!diffResult) return

    let diffText = "--- Original\n+++ Modified\n"
    diffResult.leftLines.forEach((line) => {
      if (line.type === 'removed') {
        diffText += `-${line.content}\n`
      } else if (line.type === 'unchanged') {
        diffText += ` ${line.content}\n`
      }
    })
    diffResult.rightLines.forEach((line) => {
      if (line.type === 'added') {
        diffText += `+${line.content}\n`
      }
    })

    const blob = new Blob([diffText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = 'diff.txt'
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("Diff downloaded")
  }, [diffResult, announceToScreenReader])

  const swapTexts = useCallback(() => {
    const temp = leftText
    setLeftText(rightText)
    setRightText(temp)
    announceToScreenReader("Texts swapped")
  }, [leftText, rightText, announceToScreenReader])

  const clearAll = useCallback(() => {
    setLeftText("")
    setRightText("")
    setDiffResult(null)
    if (leftFileRef.current) leftFileRef.current.value = ''
    if (rightFileRef.current) rightFileRef.current.value = ''
    announceToScreenReader("All text cleared")
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "d":
            if (diffResult) {
              e.preventDefault()
              downloadDiff()
            }
            break
          case "c":
            if (diffResult) {
              e.preventDefault()
              copyDiff()
            }
            break
          case "s":
            e.preventDefault()
            swapTexts()
            break
          case "x":
            e.preventDefault()
            clearAll()
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [diffResult, downloadDiff, copyDiff, swapTexts, clearAll])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "D"], description: "Download diff" },
    { keys: ["Ctrl", "Shift", "C"], description: "Copy diff" },
    { keys: ["Ctrl", "Shift", "S"], description: "Swap texts" },
    { keys: ["Ctrl", "Shift", "X"], description: "Clear all" },
  ]

  const renderLine = (line: DiffLine, side: 'left' | 'right') => {
    const bgColor = line.type === 'added' ? 'bg-green-50 dark:bg-green-950/30' :
                   line.type === 'removed' ? 'bg-red-50 dark:bg-red-950/30' :
                   line.type === 'unchanged' ? '' : 'bg-gray-50 dark:bg-gray-950/30'

    const textColor = line.type === 'added' ? 'text-green-700 dark:text-green-400' :
                     line.type === 'removed' ? 'text-red-700 dark:text-red-400' :
                     line.type === 'unchanged' ? 'text-foreground' : 'text-gray-600 dark:text-gray-400'

    const prefix = line.type === 'added' ? '+' :
                  line.type === 'removed' ? '-' :
                  line.type === 'unchanged' ? ' ' : '~'

    return (
      <div className={`flex ${bgColor} group hover:bg-opacity-80 transition-colors`}>
        {showLineNumbers && (
          <div className="w-12 px-2 text-xs text-muted-foreground border-r border-border bg-muted/30 select-none">
            {line.originalLineNumber !== undefined ? line.originalLineNumber + 1 : ''}
          </div>
        )}
        <div className="flex-1 flex items-center">
          <span className={`w-4 text-center ${textColor} font-mono select-none`}>{prefix}</span>
          <pre className={`flex-1 px-2 py-0.5 font-mono text-sm ${textColor} whitespace-pre-wrap break-words`}>
            {showWhitespace && line.content !== '' ? line.content.replace(/\s/g, '·') : line.content}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 flex-wrap border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Text compare controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Text Compare</span>
        <button onClick={swapTexts} aria-label="Swap original and modified"
          className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 transition-colors flex items-center gap-1">
          <ArrowRightLeft className="h-3 w-3" aria-hidden="true" />Swap <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
        </button>
        <button onClick={clearAll} aria-label="Clear all text"
          className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 transition-colors flex items-center gap-1">
          <X className="h-3 w-3" aria-hidden="true" />Clear <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
        </button>
        <div className="flex flex-wrap items-center gap-3 text-xs" role="group" aria-label="Display options">
          {[
            { label: "Line Nums", checked: showLineNumbers, set: setShowLineNumbers, id: "ln" },
            { label: "Whitespace", checked: showWhitespace, set: setShowWhitespace, id: "ws" },
            { label: "Ignore Case", checked: ignoreCase, set: setIgnoreCase, id: "ic" },
            { label: "Ignore WS", checked: ignoreWhitespace, set: setIgnoreWhitespace, id: "iw" },
          ].map(({ label, checked, set, id }) => (
            <label key={id} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={checked} onChange={(e) => { set(e.target.checked); announceToScreenReader(`${label} ${e.target.checked ? "on" : "off"}`) }} className="rounded" aria-label={label} />{label}
            </label>
          ))}
        </div>
        {diffResult && (
          <div className="flex items-center gap-3 text-xs" role="status" aria-live="polite">
            <span className="text-green-600">+{diffResult.stats.additions}</span>
            <span className="text-red-500">-{diffResult.stats.deletions}</span>
            <span className="text-muted-foreground">{diffResult.stats.unchanged} unchanged</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Text Compare" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={copyDiff} disabled={!diffResult} aria-label="Copy diff">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy Diff"}
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadDiff} disabled={!diffResult} aria-label="Download diff">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Text Compare</h2>
          <ShortcutsModal pageName="Text Compare" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Original
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Modified
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel — Original */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Original text panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Original</span>
            <div>
              <input ref={leftFileRef} type="file" accept=".txt,.md,.js,.ts,.jsx,.tsx,.css,.html,.json,.xml,.csv" onChange={(e) => { handleFileUpload('left', e); announceToScreenReader("File uploaded to original") }} className="hidden" id="left-file" aria-hidden="true" />
              <Button variant="ghost" size="sm" asChild>
                <label htmlFor="left-file" className="cursor-pointer" aria-label="Upload file to original text"><Upload className="h-3 w-3" /></label>
              </Button>
            </div>
          </div>
          <Textarea value={leftText} onChange={(e) => { setLeftText(e.target.value); announceToScreenReader("Original text updated") }} placeholder="Enter original text here..." className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4" aria-label="Original text input" />
        </div>

        {/* Right Panel — Modified + Diff */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Modified text panel">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Modified</span>
            <div>
              <input ref={rightFileRef} type="file" accept=".txt,.md,.js,.ts,.jsx,.tsx,.css,.html,.json,.xml,.csv" onChange={(e) => { handleFileUpload('right', e); announceToScreenReader("File uploaded to modified") }} className="hidden" id="right-file" aria-hidden="true" />
              <Button variant="ghost" size="sm" asChild>
                <label htmlFor="right-file" className="cursor-pointer" aria-label="Upload file to modified text"><Upload className="h-3 w-3" /></label>
              </Button>
            </div>
          </div>
          <Textarea value={rightText} onChange={(e) => { setRightText(e.target.value); announceToScreenReader("Modified text updated") }} placeholder="Enter modified text here..." className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4" aria-label="Modified text input" />
          {diffResult && (diffResult.stats.additions > 0 || diffResult.stats.deletions > 0) && (
            <div className="shrink-0 border-t border-border" role="region" aria-label="Diff view">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                <span className="text-xs font-medium">Diff View</span>
                <span className="text-xs text-muted-foreground">{diffResult.stats.additions + diffResult.stats.deletions + diffResult.stats.unchanged} total lines</span>
              </div>
              <div className="max-h-48 overflow-y-auto" role="log" aria-label="Diff results">
                <div className="flex">
                  <div className="w-1/2 border-r border-border" role="list" aria-label="Original lines">
                    {diffResult.leftLines.map((line, index) => <div key={index} role="listitem">{renderLine(line, 'left')}</div>)}
                  </div>
                  <div className="w-1/2" role="list" aria-label="Modified lines">
                    {diffResult.rightLines.map((line, index) => <div key={index} role="listitem">{renderLine(line, 'right')}</div>)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <button onClick={swapTexts} aria-label="Swap texts" className="h-11 px-2.5 rounded-md border border-border text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button onClick={clearAll} aria-label="Clear all" className="h-11 px-2.5 rounded-md border border-border text-muted-foreground">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={copyDiff} disabled={!diffResult} aria-label="Copy diff">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy Diff"}
        </Button>
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={downloadDiff} disabled={!diffResult} aria-label="Download diff">
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
