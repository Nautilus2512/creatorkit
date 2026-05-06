"use client"

import { useState } from "react"
import { Copy, Check, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

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

  const generate = () => {
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
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lorem-ipsum.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxCount = genType === "words" ? 500 : genType === "sentences" ? 50 : 20

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Lorem Ipsum Generator</h1>
            <p className="text-sm text-muted-foreground">Generate placeholder text for designs and mockups</p>
          </div>
          <Button onClick={generate}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Generate
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Type</Label>
            {(["paragraphs", "sentences", "words"] as GenType[]).map(t => (
              <button
                key={t}
                onClick={() => { setGenType(t); setCount(t === "words" ? 50 : t === "sentences" ? 5 : 3) }}
                className={`text-sm px-3 py-1 rounded-full border capitalize transition-colors ${genType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Count</Label>
            <input
              type="number"
              min={1}
              max={maxCount}
              value={count}
              onChange={e => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20 px-3 py-1 border border-border rounded-md text-sm bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="start-lorem" checked={startWithLorem} onCheckedChange={setStartWithLorem} />
            <Label htmlFor="start-lorem" className="text-sm cursor-pointer">Start with "Lorem ipsum..."</Label>
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium">Generated Text</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={download} disabled={!output}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <Textarea
          value={output}
          readOnly
          placeholder='Click "Generate" to create lorem ipsum text...'
          className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 bg-muted/5 leading-relaxed"
        />
      </div>

      {/* Status Bar */}
      {output && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
          <span>{output.split(/\s+/).filter(Boolean).length} words</span>
          <span>{output.length} characters</span>
          <span>{output.split(/\n\n/).filter(Boolean).length} paragraphs</span>
        </div>
      )}
    </div>
  )
}
