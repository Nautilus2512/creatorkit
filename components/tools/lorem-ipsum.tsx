"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, RefreshCw, Download, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "reprehenderit", "voluptate", "velit",
  "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "perspiciatis", "unde",
  "omnis", "iste", "natus", "error", "voluptatem", "accusantium", "doloremque",
  "laudantium", "totam", "rem", "aperiam", "eaque", "ipsa", "quae", "ab",
  "inventore", "veritatis", "quasi", "architecto", "beatae", "vitae", "dicta",
  "explicabo", "nemo", "ipsam", "quia", "voluptas", "aspernatur", "odit", "aut",
  "fugit", "consequuntur", "magni", "dolores", "eos", "ratione", "sequi",
  "nesciunt", "neque", "porro", "quisquam", "dolorem", "adipisci", "veritatis",
]

const LOREM_START = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."

const rnd = () => WORDS[Math.floor(Math.random() * WORDS.length)]

function makeSentence(): string {
  const count = Math.floor(Math.random() * 12) + 6
  const words = Array.from({ length: count }, rnd)
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(" ") + "."
}

function makeParagraph(useLoremStart: boolean): string {
  const count = Math.floor(Math.random() * 4) + 3
  const sentences = [
    useLoremStart ? LOREM_START : makeSentence(),
    ...Array.from({ length: count - 1 }, makeSentence),
  ]
  return sentences.join(" ")
}

type GenType = "paragraphs" | "sentences" | "words"

export default function LoremIpsum() {
  const [genType, setGenType] = useState<GenType>("paragraphs")
  const [count, setCount] = useState(3)
  const [startWithLorem, setStartWithLorem] = useState(true)
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const generate = useCallback(() => {
    let result = ""
    if (genType === "paragraphs") {
      result = Array.from({ length: count }, (_, i) =>
        makeParagraph(startWithLorem && i === 0)
      ).join("\n\n")
    } else if (genType === "sentences") {
      const sentences = [
        startWithLorem ? LOREM_START : makeSentence(),
        ...Array.from({ length: count - 1 }, makeSentence),
      ]
      result = sentences.slice(0, count).join(" ")
    } else {
      const words = startWithLorem
        ? ["Lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", ...Array.from({ length: Math.max(0, count - 8) }, rnd)]
        : Array.from({ length: count }, rnd)
      result = words.slice(0, count).join(" ")
    }
    setOutput(result)
    announceToScreenReader(`${count} ${genType} generated`)
  }, [genType, count, startWithLorem])

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader("Text copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const download = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lorem-ipsum.txt"
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    announceToScreenReader("File downloaded")
    setTimeout(() => setDownloaded(false), 2000)
  }, [output])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault()
        generate()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c" && output) {
        e.preventDefault()
        copy()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s" && output) {
        e.preventDefault()
        download()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [output, generate, copy, download])

  const maxCount = genType === "words" ? 500 : genType === "sentences" ? 50 : 20

  return (
    <>
      <ShortcutsModal
        pageName="Lorem Ipsum Generator"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "G"], description: "Generate text" },
          { keys: ["Ctrl", "Shift", "C"], description: "Copy text" },
          { keys: ["Ctrl", "Shift", "S"], description: "Download text" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
      <div className="flex h-full flex-col gap-3 p-4" role="main" aria-label="Lorem Ipsum Generator tool">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Lorem Ipsum Generator</h2>
            <p className="text-muted-foreground">Generate placeholder text for designs and mockups. Press ? for shortcuts.</p>
          </div>
          <Button 
            onClick={() => generate()}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Generate lorem ipsum text"
          >
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />Generate
            <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+G</kbd>
          </Button>
        </div>

      <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Generator settings">
        <div className="flex items-center gap-2" role="group" aria-labelledby="type-label">
          <Label className="text-sm font-medium" id="type-label">Type</Label>
          {(["paragraphs", "sentences", "words"] as GenType[]).map(t => (
            <button
              key={t}
              onClick={() => { setGenType(t); setCount(t === "words" ? 50 : t === "sentences" ? 5 : 3); announceToScreenReader(`${t} type selected`) }}
              aria-pressed={genType === t}
              aria-label={`Generate ${t}`}
              className={`text-sm px-3 py-1 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${genType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2" role="group" aria-labelledby="count-label">
          <Label className="text-sm font-medium" id="count-label">Count</Label>
          <input
            type="number" 
            min={1} 
            max={maxCount} 
            value={count}
            onChange={e => { setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value) || 1))); announceToScreenReader(`Count set to ${e.target.value}`) }}
            className="w-20 px-3 py-1 border border-border rounded-md text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Number of ${genType}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            id="start-lorem" 
            checked={startWithLorem} 
            onCheckedChange={(v) => { setStartWithLorem(v); announceToScreenReader(v ? "Starting with Lorem ipsum" : "Random starting text") }} 
          />
          <Label htmlFor="start-lorem" className="text-sm cursor-pointer">Start with "Lorem ipsum..."</Label>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="output-panel-label">
        <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium" id="output-panel-label">Generated Text</span>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copy()} 
              disabled={!output}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={copied ? "Copied to clipboard" : "Copy generated text"}
            >
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => download()} 
              disabled={!output}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={downloaded ? "File downloaded" : "Download generated text"}
            >
              {downloaded ? <FileCheck className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
              {downloaded ? "Saved!" : "Download"}
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
        </div>
        <Textarea
          value={output}
          readOnly
          placeholder='Click "Generate" to create lorem ipsum text...'
          className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 leading-relaxed p-4"
          aria-label="Generated lorem ipsum text"
        />
        {output && (
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
            <span>{output.split(/\s+/).filter(Boolean).length} words</span>
            <span>{output.length} chars</span>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
