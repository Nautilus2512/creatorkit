"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Copy, Check, Download, Upload, Code2, Loader2, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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

const shortcuts = [
  { keys: ["Ctrl", "Shift", "F"], description: "Format code" },
  { keys: ["Ctrl", "Shift", "U"], description: "Upload file" },
  { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download file" },
  { keys: ["?"], description: "Toggle this panel" },
]

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
  const [downloaded, setDownloaded]   = useState(false)
  const [activeTab, setActiveTab]     = useState<"input" | "output">("input")
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
      announceToScreenReader("Code formatted successfully")
      setActiveTab("output")
    } catch (e) {
      setFmtErr(String(e))
      setFormatted("")
      announceToScreenReader("Formatting failed")
    }
  }, [code, lang, printWidth, tabWidth, useTabs, singleQuote, semi, trailingComma, bracketSpacing])

  useEffect(() => {
    if (autoFmt && status === "ready") format()
  }, [autoFmt, code, format, status])

  const copy = useCallback(() => {
    if (!formatted) return
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    announceToScreenReader("Formatted code copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [formatted])

  const download = useCallback(() => {
    if (!formatted) return
    const blob = new Blob([formatted], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `formatted${lang.ext}`; a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    announceToScreenReader("File downloaded")
    setTimeout(() => setDownloaded(false), 2000)
  }, [formatted, lang])

  const upload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCode(ev.target?.result as string ?? "")
      const ext = "." + file.name.split(".").pop()
      const det = LANGS.find(l => l.ext === ext)
      if (det) {
        setLangId(det.id)
        announceToScreenReader(`${file.name} uploaded as ${det.label}`)
      } else {
        announceToScreenReader(`${file.name} uploaded`)
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault()
        if (status === "ready") format()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        fileRef.current?.click()
        announceToScreenReader("File upload dialog opened")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && formatted) {
        e.preventDefault()
        copy()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s" && formatted) {
        e.preventDefault()
        download()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [status, formatted, format, copy, download])

  // Options panel — shared between mobile and desktop
  const OptionsPanel = () => (
    <div className="p-4 space-y-5" role="group" aria-label="Formatter options">
      <div className="space-y-2" role="group" aria-labelledby="language-label">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="language-label">Language</Label>
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Select language">
          {LANGS.map(l => (
            <button
              key={l.id}
              onClick={() => { setLangId(l.id); announceToScreenReader(`${l.label} selected`) }}
              role="radio"
              aria-checked={langId === l.id}
              aria-label={l.label}
              className={`text-xs px-2 py-1.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${langId === l.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3" role="group" aria-labelledby="prettier-options-label">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="prettier-options-label">Prettier Options</Label>

        <div className="space-y-1.5" role="group" aria-labelledby="print-width-label">
          <Label className="text-xs text-muted-foreground" id="print-width-label">Print width</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="Print width">
            {[60, 80, 100, 120].map(w => (
              <button
                key={w}
                onClick={() => { setPrintWidth(w); announceToScreenReader(`Print width ${w}`) }}
                role="radio"
                aria-checked={printWidth === w}
                aria-label={`${w} characters`}
                className={`text-xs px-1.5 py-1 rounded border flex-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${printWidth === w ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5" role="group" aria-labelledby="tab-width-label">
          <Label className="text-xs text-muted-foreground" id="tab-width-label">Tab width</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="Tab width">
            {[2, 4].map(w => (
              <button
                key={w}
                onClick={() => { setTabWidth(w); announceToScreenReader(`${w} spaces`) }}
                role="radio"
                aria-checked={tabWidth === w}
                aria-label={`${w} spaces`}
                className={`text-xs px-3 py-1 rounded border flex-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${tabWidth === w ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {w} spaces
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground" htmlFor="use-tabs-switch">Use tabs</Label>
          <Switch id="use-tabs-switch" checked={useTabs} onCheckedChange={(v) => { setUseTabs(v); announceToScreenReader(v ? "Using tabs" : "Using spaces") }} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground" htmlFor="single-quote-switch">Single quotes</Label>
          <Switch id="single-quote-switch" checked={singleQuote} onCheckedChange={(v) => { setSingleQuote(v); announceToScreenReader(v ? "Single quotes" : "Double quotes") }} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground" htmlFor="semicolon-switch">Semicolons</Label>
          <Switch id="semicolon-switch" checked={semi} onCheckedChange={(v) => { setSemi(v); announceToScreenReader(v ? "Semicolons enabled" : "Semicolons disabled") }} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground" htmlFor="bracket-spacing-switch">Bracket spacing</Label>
          <Switch id="bracket-spacing-switch" checked={bracketSpacing} onCheckedChange={(v) => { setBracketSpacing(v); announceToScreenReader(v ? "Bracket spacing enabled" : "Bracket spacing disabled") }} />
        </div>

        <div className="space-y-1.5" role="group" aria-labelledby="trailing-comma-label">
          <Label className="text-xs text-muted-foreground" id="trailing-comma-label">Trailing commas</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="Trailing commas">
            {(["none", "es5", "all"] as const).map(v => (
              <button
                key={v}
                onClick={() => { setTrailingComma(v); announceToScreenReader(`${v} trailing commas`) }}
                role="radio"
                aria-checked={trailingComma === v}
                aria-label={v}
                className={`text-xs px-2 py-1 rounded border flex-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${trailingComma === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground" htmlFor="auto-fmt-switch">Auto-format on type</Label>
          <Switch id="auto-fmt-switch" checked={autoFmt} onCheckedChange={(v) => { setAutoFmt(v); announceToScreenReader(v ? "Auto-format enabled" : "Auto-format disabled") }} />
        </div>
      </div>

      <div className="space-y-2" role="group" aria-labelledby="file-section-label">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="file-section-label">File</Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => { fileRef.current?.click(); announceToScreenReader("File upload dialog opened") }}
          aria-label="Upload file to format"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />Upload file
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
        </Button>
        <input ref={fileRef} type="file" accept=".js,.jsx,.ts,.tsx,.css,.scss,.html,.json,.md" className="hidden" onChange={upload} aria-label="Select code file" />
      </div>
    </div>
  )

  return (
    <>
      <div className="flex flex-1 flex-col min-h-0">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="JS Formatter controls">
          <span className="text-sm font-semibold shrink-0 mr-1">JS Formatter</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <Button
            size="sm"
            onClick={() => { format() }}
            disabled={status !== "ready"}
            aria-label={status !== "ready" ? "Format (Prettier not ready)" : "Format code with Prettier"}
          >
            <Code2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Format
            <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+F</kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fileRef.current?.click(); announceToScreenReader("File upload dialog opened") }}
            aria-label="Upload file to format"
          >
            <Upload className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Upload
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
          </Button>
          {status === "loading" && <span className="text-xs text-muted-foreground flex items-center gap-1.5" aria-live="polite"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />Loading Prettier…</span>}
          {status === "ready" && <span className="text-xs text-green-600 dark:text-green-400" role="status" aria-live="polite">● Prettier ready</span>}
          {status === "error" && <span className="text-xs text-destructive" role="alert">● {loadErr}</span>}

          {/* RIGHT: primary output actions + ShortcutsModal */}
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="JS Formatter" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={() => copy()} disabled={!formatted} aria-label={copied ? "Copied to clipboard" : "Copy formatted code to clipboard"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
            </Button>
            <Button size="sm" variant={downloaded ? "outline" : "default"} onClick={() => download()} disabled={!formatted} aria-label={downloaded ? "File downloaded" : "Download formatted file"}>
              {downloaded ? <FileCheck className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
              {downloaded ? "Saved!" : "Download"}
              <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${downloaded ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">JS Formatter</h2>
            <ShortcutsModal pageName="JS Formatter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Code Input
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Formatted
            </button>
          </div>
        </div>

        {/* PANELS */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Code Input">
            {/* Desktop: options sidebar + code side by side */}
            <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
              {/* Options sidebar */}
              <div className="shrink-0 w-56 flex flex-col overflow-hidden border-r border-border" role="region" aria-labelledby="options-panel-label">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="options-panel-label">Options</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <OptionsPanel />
                </div>
              </div>
              {/* Code textarea */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Textarea
                  value={code}
                  onChange={e => { setCode(e.target.value); if (autoFmt) format() }}
                  className="flex-1 font-mono text-sm resize-none rounded-none border-0 focus-visible:ring-0 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  placeholder="Paste your code here…"
                  spellCheck={false}
                  aria-label="Code input"
                  id="code-input"
                />
              </div>
            </div>
            {/* Mobile: options collapsed above code */}
            <div className="flex md:hidden flex-1 flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 overflow-y-auto max-h-64 border-b border-border bg-muted/5">
                <OptionsPanel />
              </div>
              <Textarea
                value={code}
                onChange={e => { setCode(e.target.value); if (autoFmt) format() }}
                className="flex-1 font-mono text-sm resize-none rounded-none border-0 focus-visible:ring-0 p-4"
                placeholder="Paste your code here…"
                spellCheck={false}
                aria-label="Code input"
              />
            </div>
          </div>

          {/* Output panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="Formatted Output">
            <div className="flex-1 overflow-y-auto">
              {fmtErr
                ? <div className="p-4" role="alert"><div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">{fmtErr}</div></div>
                : <pre
                    className="p-4 text-sm font-mono whitespace-pre leading-relaxed"
                    role="textbox"
                    aria-label="Formatted code output"
                    aria-readonly="true"
                  >{formatted || <span className="text-muted-foreground italic">Formatted output will appear here…</span>}</pre>
              }
              <div className="p-4 pt-0 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                  <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                    <li>Paste your code into the left panel, or click <span className="text-foreground font-medium">Upload</span> (<span className="text-foreground font-medium">Ctrl+Shift+U</span>) to open a file directly.</li>
                    <li>Select the correct language in the Options sidebar. Language is also detected automatically from the file extension on upload.</li>
                    <li>Adjust Prettier options as needed: print width, tab width, quotes, semicolons, and trailing commas.</li>
                    <li>Click <span className="text-foreground font-medium">Format</span> or press <span className="text-foreground font-medium">Ctrl+Shift+F</span>. Formatted code appears in this panel.</li>
                    <li>Copy with <span className="text-foreground font-medium">Ctrl+Shift+V</span> or download with <span className="text-foreground font-medium">Ctrl+Shift+S</span>.</li>
                  </ol>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tips</p>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                      <li>Enable <span className="text-foreground font-medium">Auto-format on type</span> to reformat instantly as you edit.</li>
                      <li>Prettier loads from CDN on first use. The green dot in the toolbar confirms it is ready.</li>
                      <li>Supports JavaScript, JSX, TypeScript, TSX, CSS, HTML, JSON, and Markdown.</li>
                      <li>Everything runs in your browser. Nothing is sent to a server.</li>
                    </ul>
                  </div>
                </div>
                <div className="md:hidden h-[60px]" aria-hidden="true" />
              </div>
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <Button size="sm" className="h-11 px-3" onClick={() => { format() }} disabled={status !== "ready"} aria-label={status !== "ready" ? "Format (Prettier not ready)" : "Format code"}>
            <Code2 className="h-4 w-4" aria-hidden="true" /><span className="ml-1 text-xs">Format</span>
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-11 px-3" onClick={() => copy()} disabled={!formatted} aria-label={copied ? "Copied to clipboard" : "Copy formatted code"}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button size="sm" variant={downloaded ? "outline" : "default"} className="h-11 px-3" onClick={() => download()} disabled={!formatted} aria-label={downloaded ? "File downloaded" : "Download formatted file"}>
            {downloaded ? <FileCheck className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            <span className="ml-1 text-xs">{downloaded ? "Saved!" : "Save"}</span>
          </Button>
        </div>

      </div>
    </>
  )
}
