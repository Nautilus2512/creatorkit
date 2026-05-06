"use client"

import { useState, useRef, useEffect } from "react"
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
  const leftFileRef = useRef<HTMLInputElement>(null)
  const rightFileRef = useRef<HTMLInputElement>(null)

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

  const copyDiff = async () => {
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
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDiff = () => {
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
  }

  const swapTexts = () => {
    const temp = leftText
    setLeftText(rightText)
    setRightText(temp)
  }

  const clearAll = () => {
    setLeftText("")
    setRightText("")
    setDiffResult(null)
    if (leftFileRef.current) leftFileRef.current.value = ''
    if (rightFileRef.current) rightFileRef.current.value = ''
  }

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
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ShortcutsModal
        pageName="text-compare"
        shortcuts={[
          { keys: ["Ctrl", "S"], description: "Download diff" },
          { keys: ["Ctrl", "Shift", "C"], description: "Copy diff" },
          { keys: ["Ctrl", "R"], description: "Swap texts" },
          { keys: ["Ctrl", "L"], description: "Clear all" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-muted/50 p-2">
            <GitCompare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">text-compare</h1>
            <p className="text-xs text-muted-foreground">Compare text and files with visual diff highlighting</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={swapTexts}>
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Swap
          </Button>
          
          <Button variant="outline" size="sm" onClick={clearAll}>
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
          
          <div className="h-4 w-px bg-border" />
          
          <Button variant="outline" size="sm" onClick={copyDiff} disabled={!diffResult}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={downloadDiff} disabled={!diffResult}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="flex items-center gap-4 p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="rounded"
            />
            Line Numbers
          </label>
          
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showWhitespace}
              onChange={(e) => setShowWhitespace(e.target.checked)}
              className="rounded"
            />
            Show Whitespace
          </label>
          
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
              className="rounded"
            />
            Ignore Case
          </label>
          
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="rounded"
            />
            Ignore Whitespace
          </label>
        </div>

        {diffResult && (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              +{diffResult.stats.additions}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              -{diffResult.stats.deletions}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              {diffResult.stats.unchanged}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Original</h3>
            <div className="flex items-center gap-2">
              <input
                ref={leftFileRef}
                type="file"
                accept=".txt,.md,.js,.ts,.jsx,.tsx,.css,.html,.json,.xml,.csv"
                onChange={(e) => handleFileUpload('left', e)}
                className="hidden"
                id="left-file"
              />
              <Button variant="ghost" size="sm" asChild>
                <label htmlFor="left-file" className="cursor-pointer">
                  <Upload className="h-3 w-3" />
                </label>
              </Button>
            </div>
          </div>
          <Textarea
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder="Enter original text here..."
            className="flex-1 resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4"
          />
        </div>

        {/* Right Panel */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Modified</h3>
            <div className="flex items-center gap-2">
              <input
                ref={rightFileRef}
                type="file"
                accept=".txt,.md,.js,.ts,.jsx,.tsx,.css,.html,.json,.xml,.csv"
                onChange={(e) => handleFileUpload('right', e)}
                className="hidden"
                id="right-file"
              />
              <Button variant="ghost" size="sm" asChild>
                <label htmlFor="right-file" className="cursor-pointer">
                  <Upload className="h-3 w-3" />
                </label>
              </Button>
            </div>
          </div>
          <Textarea
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder="Enter modified text here..."
            className="flex-1 resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4"
          />
        </div>
      </div>

      {/* Diff View */}
      {diffResult && (diffResult.stats.additions > 0 || diffResult.stats.deletions > 0) && (
        <div className="border-t border-border bg-background">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Diff View</h3>
            <div className="text-xs text-muted-foreground">
              {diffResult.stats.additions + diffResult.stats.deletions + diffResult.stats.unchanged} total lines
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <div className="flex">
              <div className="w-1/2 border-r border-border">
                {diffResult.leftLines.map((line, index) => (
                  <div key={index}>{renderLine(line, 'left')}</div>
                ))}
              </div>
              <div className="w-1/2">
                {diffResult.rightLines.map((line, index) => (
                  <div key={index}>{renderLine(line, 'right')}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}