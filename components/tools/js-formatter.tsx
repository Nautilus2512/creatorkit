"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Copy, Check, Download, Upload, Code2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

declare global {
  interface Window {
    prettier: { format(src: string, opts: Record<string, unknown>): string }
    prettierPlugins: Record<string, unknown>
  }
}

const CDN_SCRIPTS = [
  "https://unpkg.com/prettier@2.8.8/standalone.js",
  "https://unpkg.com/prettier@2.8.8/parser-babel.js",
  "https://unpkg.com/prettier@2.8.8/parser-typescript.js",
  "https://unpkg.com/prettier@2.8.8/parser-postcss.js",
  "https://unpkg.com/prettier@2.8.8/parser-html.js",
  "https://unpkg.com/prettier@2.8.8/parser-markdown.js",
]

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement("script")
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(s)
  })
}

type Lang = { id: string; label: string; parser: string; pluginKey: string; ext: string }
const LANGS: Lang[] = [
  { id: "js",   label: "JavaScript", parser: "babel",      pluginKey: "babel",      ext: ".js"   },
  { id: "jsx",  label: "JSX",        parser: "babel",      pluginKey: "babel",      ext: ".jsx"  },
  { id: "ts",   label: "TypeScript", parser: "typescript", pluginKey: "typescript", ext: ".ts"   },
  { id: "tsx",  label: "TSX",        parser: "typescript", pluginKey: "typescript", ext: ".tsx"  },
  { id: "css",  label: "CSS / SCSS", parser: "css",        pluginKey: "postcss",    ext: ".css"  },
  { id: "html", label: "HTML",       parser: "html",       pluginKey: "html",       ext: ".html" },
  { id: "json", label: "JSON",       parser: "json",       pluginKey: "babel",      ext: ".json" },
  { id: "md",   label: "Markdown",   parser: "markdown",   pluginKey: "markdown",   ext: ".md"   },
]

const DEFAULT_CODE = `function calculateTotal(items) {
const total = items.reduce((sum,item) => {
return sum + item.price * item.quantity
},0)
return total
}

const cart=[{name:'Widget',price:9.99,quantity:3},{name:'Gadget',price:24.99,quantity:1}]
console.log('Total:',calculateTotal(cart))
`

export default function JsFormatter() {
  const [code, setCode]               = useState(DEFAULT_CODE)
  const [formatted, setFormatted]     = useState("")
  const [langId, setLangId]           = useState("js")
  const [status, setStatus]           = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [loadErr, setLoadErr]         = useState("")
  const [fmtErr, setFmtErr]           = useState("")
  const [printWidth, setPrintWidth]   = useState(80)
  const [tabWidth, setTabWidth]       = useState(2)
  const [useTabs, setUseTabs]         = useState(false)
  const [singleQuote, setSingleQuote] = useState(false)
  const [semi, setSemi]               = useState(true)
  const [trailingComma, setTrailingComma] = useState<"none" | "es5" | "all">("es5")
  const [bracketSpacing, setBracketSpacing] = useState(true)
  const [autoFmt, setAutoFmt]         = useState(false)
  const [copied, setCopied]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const lang = LANGS.find(l => l.id === langId)!

  useEffect(() => {
    setStatus("loading")
    Promise.all(CDN_SCRIPTS.map(loadScript))
      .then(() => setStatus("ready"))
      .catch(e => { setLoadErr(String(e)); setStatus("error") })
  }, [])

  const format = useCallback(() => {
    if (typeof window === "undefined" || !window.prettier) return
    setFmtErr("")
    try {
      const plugin = window.prettierPlugins?.[lang.pluginKey]
      const result = window.prettier.format(code, {
        parser: lang.parser,
        plugins: plugin ? [plugin] : [],
        printWidth,
        tabWidth,
        useTabs,
        singleQuote,
        semi,
        trailingComma,
        bracketSpacing,
      })
      setFormatted(result)
    } catch (e) {
      setFmtErr(String(e))
      setFormatted("")
    }
  }, [code, lang, printWidth, tabWidth, useTabs, singleQuote, semi, trailingComma, bracketSpacing])

  useEffect(() => {
    if (autoFmt && status === "ready") format()
  }, [autoFmt, code, format, status])

  const copy = () => {
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([formatted], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `formatted${lang.ext}`; a.click()
    URL.revokeObjectURL(url)
  }

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCode(ev.target?.result as string ?? "")
      const ext = "." + file.name.split(".").pop()
      const det = LANGS.find(l => l.ext === ext)
      if (det) setLangId(det.id)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">JS Formatter</h1>
          <p className="text-sm text-muted-foreground">Format code with Prettier 2.8.8. Runs entirely in your browser.</p>
        </div>
        <div className="flex items-center gap-2">
          {status === "loading" && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Loading Prettier…</span>}
          {status === "ready"   && <span className="text-xs text-green-600 dark:text-green-400">● Prettier ready</span>}
          {status === "error"   && <span className="text-xs text-destructive">● {loadErr}</span>}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Options panel */}
        <div className="w-60 shrink-0 border-r border-border overflow-y-auto p-4 space-y-5">

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</Label>
            <div className="grid grid-cols-2 gap-1">
              {LANGS.map(l => (
                <button key={l.id} onClick={() => setLangId(l.id)}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${langId === l.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prettier Options</Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Print width</Label>
              <div className="flex gap-1">
                {[60, 80, 100, 120].map(w => (
                  <button key={w} onClick={() => setPrintWidth(w)}
                    className={`text-xs px-1.5 py-1 rounded border flex-1 transition-colors ${printWidth === w ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tab width</Label>
              <div className="flex gap-1">
                {[2, 4].map(w => (
                  <button key={w} onClick={() => setTabWidth(w)}
                    className={`text-xs px-3 py-1 rounded border flex-1 transition-colors ${tabWidth === w ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {w} spaces
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Use tabs</Label>
              <Switch checked={useTabs} onCheckedChange={setUseTabs} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Single quotes</Label>
              <Switch checked={singleQuote} onCheckedChange={setSingleQuote} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Semicolons</Label>
              <Switch checked={semi} onCheckedChange={setSemi} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Bracket spacing</Label>
              <Switch checked={bracketSpacing} onCheckedChange={setBracketSpacing} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Trailing commas</Label>
              <div className="flex gap-1">
                {(["none", "es5", "all"] as const).map(v => (
                  <button key={v} onClick={() => setTrailingComma(v)}
                    className={`text-xs px-2 py-1 rounded border flex-1 transition-colors ${trailingComma === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Auto-format on type</Label>
              <Switch checked={autoFmt} onCheckedChange={setAutoFmt} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File</Label>
            <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />Upload file
            </Button>
            <input ref={fileRef} type="file" accept=".js,.jsx,.ts,.tsx,.css,.scss,.html,.json,.md" className="hidden" onChange={upload} />
          </div>
        </div>

        {/* Code panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Input */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
            <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Input</span>
              <Button size="sm" onClick={format} disabled={status !== "ready"} className="h-7">
                <Code2 className="h-3.5 w-3.5 mr-1" />Format
              </Button>
            </div>
            <Textarea
              value={code} onChange={e => setCode(e.target.value)}
              className="flex-1 font-mono text-sm resize-none rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Paste your code here…" spellCheck={false}
            />
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Output</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={copy} disabled={!formatted} className="h-7">
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" onClick={download} disabled={!formatted} className="h-7">
                  <Download className="h-3.5 w-3.5 mr-1" />Download
                </Button>
              </div>
            </div>
            {fmtErr
              ? <div className="flex-1 p-4 overflow-auto">
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">{fmtErr}</div>
                </div>
              : <pre className="flex-1 overflow-auto p-4 text-sm font-mono whitespace-pre leading-relaxed">
                  {formatted || <span className="text-muted-foreground italic">Formatted output will appear here…</span>}
                </pre>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
