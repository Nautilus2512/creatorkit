"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ─── Font database ─────────────────────────────────────────────────────────────
type Cat = "serif" | "sans-serif" | "display" | "monospace" | "handwriting"

interface FontInfo { family: string; category: Cat }

const FONTS: FontInfo[] = [
  // Serif
  { family: "Playfair Display",    category: "serif" },
  { family: "Merriweather",        category: "serif" },
  { family: "Lora",                category: "serif" },
  { family: "EB Garamond",         category: "serif" },
  { family: "Cormorant Garamond",  category: "serif" },
  { family: "Libre Baskerville",   category: "serif" },
  { family: "Spectral",            category: "serif" },
  { family: "Bitter",              category: "serif" },
  { family: "Crimson Text",        category: "serif" },
  { family: "PT Serif",            category: "serif" },
  { family: "Source Serif 4",      category: "serif" },
  { family: "Noto Serif",          category: "serif" },
  { family: "Alegreya",            category: "serif" },
  // Sans-serif
  { family: "Inter",               category: "sans-serif" },
  { family: "Roboto",              category: "sans-serif" },
  { family: "Open Sans",           category: "sans-serif" },
  { family: "Lato",                category: "sans-serif" },
  { family: "Nunito",              category: "sans-serif" },
  { family: "Poppins",             category: "sans-serif" },
  { family: "Raleway",             category: "sans-serif" },
  { family: "Montserrat",          category: "sans-serif" },
  { family: "Ubuntu",              category: "sans-serif" },
  { family: "Work Sans",           category: "sans-serif" },
  { family: "DM Sans",             category: "sans-serif" },
  { family: "Outfit",              category: "sans-serif" },
  { family: "Plus Jakarta Sans",   category: "sans-serif" },
  { family: "Figtree",             category: "sans-serif" },
  { family: "Manrope",             category: "sans-serif" },
  { family: "Josefin Sans",        category: "sans-serif" },
  { family: "Karla",               category: "sans-serif" },
  { family: "Mulish",              category: "sans-serif" },
  { family: "Quicksand",           category: "sans-serif" },
  { family: "Source Sans 3",       category: "sans-serif" },
  // Display
  { family: "Oswald",              category: "display" },
  { family: "Bebas Neue",          category: "display" },
  { family: "Anton",               category: "display" },
  { family: "Righteous",           category: "display" },
  { family: "Abril Fatface",       category: "display" },
  { family: "Fjalla One",          category: "display" },
  { family: "Russo One",           category: "display" },
  { family: "Boogaloo",            category: "display" },
  { family: "Lilita One",          category: "display" },
  // Monospace
  { family: "Roboto Mono",         category: "monospace" },
  { family: "Fira Code",           category: "monospace" },
  { family: "Source Code Pro",     category: "monospace" },
  { family: "JetBrains Mono",      category: "monospace" },
  { family: "Space Mono",          category: "monospace" },
  { family: "Courier Prime",       category: "monospace" },
  { family: "IBM Plex Mono",       category: "monospace" },
  // Handwriting
  { family: "Dancing Script",      category: "handwriting" },
  { family: "Pacifico",            category: "handwriting" },
  { family: "Lobster",             category: "handwriting" },
  { family: "Sacramento",          category: "handwriting" },
  { family: "Great Vibes",         category: "handwriting" },
  { family: "Satisfy",             category: "handwriting" },
  { family: "Caveat",              category: "handwriting" },
  { family: "Cookie",              category: "handwriting" },
]

// ─── Suggested pairings ────────────────────────────────────────────────────────
interface Pairing { name: string; heading: string; body: string; vibe: string }

const PAIRINGS: Pairing[] = [
  { name: "Editorial Classic",  heading: "Playfair Display",   body: "Lato",          vibe: "Elegant magazine style" },
  { name: "Modern Readability", heading: "Merriweather",        body: "Open Sans",     vibe: "Optimised for long reads" },
  { name: "Contemporary",       heading: "Montserrat",          body: "Merriweather",  vibe: "Bold headers, warm body" },
  { name: "Elegant Contrast",   heading: "Raleway",             body: "Lora",          vibe: "Refined and sophisticated" },
  { name: "Newspaper",          heading: "Playfair Display",   body: "Source Sans 3", vibe: "Classic print journalism" },
  { name: "Bold & Clean",       heading: "Oswald",              body: "Lato",          vibe: "Strong headlines, clean body" },
  { name: "Tech Docs",          heading: "Roboto",              body: "Roboto Mono",   vibe: "Developer documentation" },
  { name: "Friendly & Round",   heading: "Poppins",             body: "Nunito",        vibe: "Approachable and modern" },
  { name: "Scholarly",          heading: "EB Garamond",         body: "Source Sans 3", vibe: "Academic and timeless" },
  { name: "Creative Agency",    heading: "Bebas Neue",          body: "Work Sans",     vibe: "Bold impact, clean body" },
  { name: "Personal Brand",     heading: "Dancing Script",      body: "Lato",          vibe: "Warm and inviting blog" },
  { name: "Ultra Modern",       heading: "Inter",               body: "Inter",         vibe: "System-native digital feel" },
  { name: "Luxury",             heading: "Cormorant Garamond",  body: "Raleway",       vibe: "High-end and refined" },
  { name: "Startup",            heading: "Outfit",              body: "Inter",         vibe: "Clean and contemporary" },
]

// ─── Category styling ──────────────────────────────────────────────────────────
const CAT_BADGE: Record<Cat, string> = {
  "serif":       "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "sans-serif":  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "display":     "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "monospace":   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "handwriting": "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
}
const CAT_LABEL: Record<Cat, string> = {
  "serif": "Serif", "sans-serif": "Sans", "display": "Display",
  "monospace": "Mono", "handwriting": "Script",
}
const ALL_CATS: (Cat | "all")[] = ["all", "serif", "sans-serif", "display", "monospace", "handwriting"]

// ─── Google Font loader (client-side only, idempotent) ─────────────────────────
const loadedFonts = new Set<string>()

function loadFont(family: string) {
  if (typeof document === "undefined" || loadedFonts.has(family)) return
  loadedFonts.add(family)
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;600;700&display=swap`
  document.head.appendChild(link)
}

// ─── Font selector component ───────────────────────────────────────────────────
interface FontSelectorProps {
  label: string
  selected: string
  onSelect: (f: string) => void
  cat: Cat | "all"
  onCat: (c: Cat | "all") => void
}

function FontSelector({ label, selected, onSelect, cat, onCat }: FontSelectorProps) {
  const [search, setSearch] = useState("")
  const filtered = FONTS.filter(f =>
    (cat === "all" || f.category === cat) &&
    f.family.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="space-y-2">
      <Label id={`${label.toLowerCase().replace(/\s/g,"-")}-label`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        placeholder="Search…" 
        className="h-8 text-sm" 
        aria-label={`Search ${label} fonts`}
      />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by category">
        {ALL_CATS.map(c => (
          <button 
            key={c} 
            onClick={() => onCat(c)}
            aria-pressed={cat === c}
            aria-label={`${c === "all" ? "All categories" : c} filter`}
            className={`text-xs px-2 py-0.5 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            {c === "all" ? "All" : CAT_LABEL[c as Cat]}
          </button>
        ))}
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="max-h-44 overflow-y-auto divide-y divide-border/50" role="listbox" aria-label={`${label} options`}>
          {filtered.length === 0
            ? <div className="p-3 text-xs text-muted-foreground text-center">No fonts found</div>
            : filtered.map(f => (
              <button 
                key={f.family} 
                onClick={() => onSelect(f.family)}
                role="option"
                aria-selected={selected === f.family}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${selected === f.family ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                <span className="text-sm truncate" style={{ fontFamily: `'${f.family}', sans-serif` }}>{f.family}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 shrink-0 ${CAT_BADGE[f.category]}`}>{CAT_LABEL[f.category]}</span>
              </button>
            ))
          }
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Selected: <span className="font-medium text-foreground" style={{ fontFamily: `'${selected}', sans-serif` }}>{selected}</span>
      </p>
    </div>
  )
}

// ─── Preview themes ────────────────────────────────────────────────────────────
const THEMES = {
  light: { bg: "#ffffff", card: "#f8f9fa", text: "#1a1a1a", sub: "#555555" },
  dark:  { bg: "#0f0f13", card: "#1a1a24", text: "#e4e4e8", sub: "#9090a0" },
  sepia: { bg: "#f8f1e3", card: "#f0e6d3", text: "#3d2b1f", sub: "#6b4f3a" },
}

// ─── Accessibility helper ──────────────────────────────────────────────────────
function announceToScreenReader(message: string) {
  const el = document.createElement("div")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.setAttribute("aria-atomic", "true")
  el.className = "sr-only"
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => document.body.removeChild(el), 1000)
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function FontPairer() {
  const [headingFont, setHeadingFont] = useState("Playfair Display")
  const [bodyFont, setBodyFont]       = useState("Lato")
  const [headingCat, setHeadingCat]   = useState<Cat | "all">("all")
  const [bodyCat, setBodyCat]         = useState<Cat | "all">("all")
  const [headingSize, setHeadingSize] = useState(48)
  const [bodySize, setBodySize]       = useState(17)
  const [theme, setTheme]             = useState<"light" | "dark" | "sepia">("light")
  const [previewText, setPreviewText] = useState("The quick brown fox")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const [copied, setCopied]           = useState(false)

  // Load fonts whenever selections change
  useEffect(() => { loadFont(headingFont) }, [headingFont])
  useEffect(() => { loadFont(bodyFont) }, [bodyFont])

  // Preload all suggestion fonts on mount
  useEffect(() => {
    PAIRINGS.forEach(p => { loadFont(p.heading); loadFont(p.body) })
  }, [])

  const applyPairing = (p: Pairing) => { setHeadingFont(p.heading); setBodyFont(p.body) }
  const randomPairing = useCallback(() => {
    const p = PAIRINGS[Math.floor(Math.random() * PAIRINGS.length)]
    applyPairing(p)
    announceToScreenReader(`Random pairing applied: ${p.heading} and ${p.body}.`)
  }, [])

  const cycleTheme = useCallback(() => {
    const themes: ("light" | "dark" | "sepia")[] = ["light", "dark", "sepia"]
    const next = themes[(themes.indexOf(theme) + 1) % 3]
    setTheme(next)
    announceToScreenReader(`Theme changed to ${next}.`)
  }, [theme])

  const activePairing = PAIRINGS.find(p => p.heading === headingFont && p.body === bodyFont)

  // Build CSS import string
  const sameFont = headingFont === bodyFont
  const encodedH = headingFont.replace(/ /g, "+")
  const encodedB = bodyFont.replace(/ /g, "+")
  const importUrl = sameFont
    ? `https://fonts.googleapis.com/css2?family=${encodedH}:wght@300;400;600;700&display=swap`
    : `https://fonts.googleapis.com/css2?family=${encodedH}:wght@300;400;600;700&family=${encodedB}:wght@300;400;600;700&display=swap`
  const hCat = FONTS.find(f => f.family === headingFont)?.category ?? "sans-serif"
  const bCat = FONTS.find(f => f.family === bodyFont)?.category ?? "sans-serif"

  const cssCode = `/* Import */
@import url('${importUrl}');

/* Variables */
:root {
  --font-heading: '${headingFont}', ${hCat};
  --font-body: '${bodyFont}', ${bCat};
}

/* Usage */
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
body, p { font-family: var(--font-body); }`

  const copy = useCallback(() => {
    navigator.clipboard.writeText(cssCode)
    setCopied(true)
    announceToScreenReader("CSS copied to clipboard.")
    setTimeout(() => setCopied(false), 2000)
  }, [cssCode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") { e.preventDefault(); randomPairing() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); cycleTheme() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") { e.preventDefault(); copy() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [randomPairing, cycleTheme, copy])

  const t = THEMES[theme]

  return (
    <div className="flex flex-1 flex-col min-h-0">

        {/* Desktop: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Font Pairer</span>
          <Button variant="ghost" size="sm" onClick={randomPairing} aria-label="Apply random font pairing">
            <Shuffle className="h-4 w-4 mr-1" aria-hidden="true" />Random
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Font Pairer" shortcuts={[
              { keys: ["Ctrl", "Shift", "X"], description: "Random pairing" },
              { keys: ["Ctrl", "Shift", "L"], description: "Cycle theme" },
              { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS" },
              { keys: ["?"], description: "Toggle this panel" },
            ]} />
            <Button variant="outline" size="sm" onClick={copy} aria-label={copied ? "CSS copied" : "Copy CSS"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy CSS"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
            </Button>
          </div>
        </div>

        {/* Mobile: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h2 className="text-base font-semibold">Font Pairer</h2>
            <ShortcutsModal pageName="Font Pairer" shortcuts={[
              { keys: ["Ctrl", "Shift", "X"], description: "Random pairing" },
              { keys: ["Ctrl", "Shift", "L"], description: "Cycle theme" },
              { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS" },
              { keys: ["?"], description: "Toggle this panel" },
            ]} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Settings
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Preview
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left — controls */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}>
            <div className="shrink-0 border-b border-border px-4 py-3"><span className="text-sm font-medium">Font Settings</span></div>
            <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5">

              <FontSelector
                label="Heading Font"
                selected={headingFont}
                onSelect={setHeadingFont}
                cat={headingCat}
                onCat={setHeadingCat}
              />

              <FontSelector
                label="Body Font"
                selected={bodyFont}
                onSelect={setBodyFont}
                cat={bodyCat}
                onCat={setBodyCat}
              />

              {/* Size sliders */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sizes</Label>
                {[
                  { label: "Heading", value: headingSize, set: setHeadingSize, min: 20, max: 96 },
                  { label: "Body",    value: bodySize,    set: setBodySize,    min: 10, max: 28 },
                ].map(({ label, value, set, min, max }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground" id={`${label.toLowerCase()}-size-label`}>{label}</Label>
                      <span className="text-xs font-mono text-muted-foreground" aria-labelledby={`${label.toLowerCase()}-size-label`}>{value}px</span>
                    </div>
                    <Slider 
                      value={[value]} 
                      onValueChange={([v]) => set(v)} 
                      min={min} 
                      max={max} 
                      step={1}
                      aria-label={`${label} font size`}
                      aria-valuetext={`${value} pixels`}
                    />
                  </div>
                ))}
              </div>

              {/* Suggested pairings */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested Pairings
                </Label>
                <div className="space-y-1.5" role="list" aria-label="Suggested font pairings">
                  {PAIRINGS.map(p => (
                    <button 
                      key={p.name} 
                      onClick={() => applyPairing(p)}
                      role="listitem"
                      aria-label={`Apply pairing: ${p.name}, heading ${p.heading}, body ${p.body}`}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        headingFont === p.heading && bodyFont === p.body
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/20"
                      }`}>
                      <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <span className="text-xs font-medium truncate" style={{ fontFamily: `'${p.heading}', serif` }}>{p.heading}</span>
                        <span className="text-xs text-muted-foreground shrink-0" style={{ fontFamily: `'${p.body}', sans-serif` }}>{p.body}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.vibe}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage guide */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Pick a <span className="text-foreground font-medium">Heading Font</span> and a <span className="text-foreground font-medium">Body Font</span> from the lists, or click a suggested pairing to apply both at once.</li>
                  <li>Use the <span className="text-foreground font-medium">Sizes</span> sliders to adjust heading and body size in the preview.</li>
                  <li>Switch the preview theme (Light / Dark / Sepia) to check readability across backgrounds.</li>
                  <li>Click <span className="text-foreground font-medium">Copy CSS</span> to grab the <code className="bg-muted px-1 rounded">@import</code> URL and CSS variables, ready to paste into your stylesheet.</li>
                </ol>
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
                  <p className="text-xs text-muted-foreground"><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+X</kbd> random pairing &nbsp; <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd> cycle theme &nbsp; <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copy CSS</p>
                </div>
                <p className="text-xs text-muted-foreground">Fonts are loaded from Google Fonts. Nothing you type is sent to a server.</p>
              </div>

              <div className="md:hidden h-[60px]" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Right — preview */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`}>
            {/* Preview toolbar */}
            <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex gap-1" role="group" aria-label="Preview theme">
                <span id="theme-hint" className="sr-only">Press Ctrl+Shift+T to cycle themes</span>
                {(["light", "dark", "sepia"] as const).map(th => (
                  <button 
                    key={th} 
                    onClick={() => setTheme(th)}
                    aria-pressed={theme === th}
                    aria-label={`${th} theme`}
                    aria-describedby="theme-hint"
                    className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${theme === th ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    {th}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <Input
                value={previewText}
                onChange={e => setPreviewText(e.target.value)}
                placeholder="Preview text…"
                className="text-xs h-7 max-w-56"
                aria-label="Preview text input"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Active pairing label */}
              {activePairing && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{activePairing.name}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-muted-foreground text-xs">{activePairing.vibe}</span>
                </div>
              )}

              {/* Main preview */}
              <div className="rounded-xl border border-border p-8 transition-colors" style={{ backgroundColor: t.bg }}>
                <div
                  style={{
                    fontFamily: `'${headingFont}', serif`,
                    fontSize: headingSize,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: t.text,
                    marginBottom: "0.3em",
                  }}
                >
                  {previewText || "The quick brown fox"}
                </div>
                <div
                  style={{
                    fontFamily: `'${headingFont}', serif`,
                    fontSize: Math.round(headingSize * 0.55),
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: t.sub,
                    marginBottom: "1.2em",
                  }}
                >
                  A subtitle set in {headingFont}
                </div>
                <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: bodySize, lineHeight: 1.75, color: t.text, marginBottom: "0.8em" }}>
                  This body text is set in <strong>{bodyFont}</strong>. Good typographic pairing balances contrast and harmony — the heading draws the eye while the body sustains comfortable reading. {headingFont} and {bodyFont} complement each other{activePairing ? ` with a ${activePairing.vibe.toLowerCase()} quality` : ""}.
                </p>
                <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: Math.round(bodySize * 0.88), lineHeight: 1.65, color: t.sub }}>
                  Secondary text at {Math.round(bodySize * 0.88)}px. The five boxing wizards jump quickly. Pack my box with five dozen liquor jugs.
                </p>
              </div>

              {/* Weight specimen */}
              <div className="rounded-xl border border-border p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Specimens</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {([300, 400, 600, 700] as const).map(w => (
                    <div key={`h${w}`} style={{ fontFamily: `'${headingFont}', serif`, fontWeight: w, fontSize: 22, lineHeight: 1.2 }}>
                      {headingFont} {w}
                    </div>
                  ))}
                  {([300, 400, 600, 700] as const).map(w => (
                    <div key={`b${w}`} style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: w, fontSize: 14, lineHeight: 1.5 }}>
                      {bodyFont} {w} — The quick brown fox
                    </div>
                  ))}
                </div>
              </div>

              {/* CSS output */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CSS Import</span>
                  <Button variant="ghost" size="sm" onClick={copy} aria-label={copied ? "CSS copied to clipboard" : "Copy CSS to clipboard"} className="h-7">
                    {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                    {copied ? "Copied!" : "Copy CSS"}
                    <kbd className="ml-1.5 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
                  </Button>
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto bg-muted/10 leading-relaxed whitespace-pre">{cssCode}</pre>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile: bottom action bar */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant="ghost" size="sm" className="h-11 px-3" onClick={randomPairing} aria-label="Random pairing">
            <Shuffle className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex-1" />
          <Button size="sm" className="h-11 px-4" onClick={copy} aria-label={copied ? "CSS copied" : "Copy CSS"}>
            {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy CSS"}
          </Button>
        </div>

      </div>
  )
}
