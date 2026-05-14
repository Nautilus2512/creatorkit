"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, RefreshCw, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const NUMBERS = "0123456789"
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?"
const AMBIGUOUS = new Set(["l", "1", "I", "O", "0"])

function buildCharset(opts: {
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}): string {
  let charset = ""
  if (opts.uppercase) charset += UPPERCASE
  if (opts.lowercase) charset += LOWERCASE
  if (opts.numbers) charset += NUMBERS
  if (opts.symbols) charset += SYMBOLS
  if (opts.excludeAmbiguous) charset = [...charset].filter(c => !AMBIGUOUS.has(c)).join("")
  return charset
}

function generateOne(length: number, charset: string): string {
  if (!charset) return ""
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, n => charset[n % charset.length]).join("")
}

function getStrength(length: number, charsetSize: number): { label: string; color: string } {
  if (!charsetSize) return { label: "No characters selected", color: "text-muted-foreground" }
  const bits = length * Math.log2(charsetSize)
  if (bits < 40) return { label: "Weak", color: "text-red-500" }
  if (bits < 60) return { label: "Fair", color: "text-amber-500" }
  if (bits < 80) return { label: "Strong", color: "text-green-500" }
  return { label: "Very Strong", color: "text-emerald-500" }
}

export function PasswordGenerator() {
  const [length, setLength] = useState(16)
  const [uppercase, setUppercase] = useState(true)
  const [lowercase, setLowercase] = useState(true)
  const [numbers, setNumbers] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [quantity, setQuantity] = useState<1 | 5 | 10 | 20>(1)
  const [passwords, setPasswords] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const charset = buildCharset({ uppercase, lowercase, numbers, symbols, excludeAmbiguous })
  const strength = getStrength(length, charset.length)

  const generate = useCallback(() => {
    const result: string[] = []
    for (let i = 0; i < quantity; i++) {
      result.push(generateOne(length, charset))
    }
    setPasswords(result)
    setCopiedIndex(null)
    setCopiedAll(false)
    announceToScreenReader(`Generated ${quantity} password${quantity > 1 ? "s" : ""}`)
  }, [length, charset, quantity, announceToScreenReader])

  const copyOne = useCallback((index: number) => {
    navigator.clipboard.writeText(passwords[index])
    setCopiedIndex(index)
    announceToScreenReader("Password copied to clipboard")
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [passwords, announceToScreenReader])

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(passwords.join("\n"))
    setCopiedAll(true)
    announceToScreenReader("All passwords copied to clipboard")
    setTimeout(() => setCopiedAll(false), 2000)
  }, [passwords, announceToScreenReader])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault()
        generate()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [generate])

  const quantities: (1 | 5 | 10 | 20)[] = [1, 5, 10, 20]

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Password generator controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Password Generator</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Password Generator" shortcuts={[{ keys: ["Ctrl", "Shift", "G"], description: "Generate passwords" }]} />
          <Button size="sm" onClick={generate} disabled={!charset} aria-label={quantity > 1 ? `Generate ${quantity} passwords` : "Generate password"}>
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
            Generate{quantity > 1 ? ` ${quantity}` : ""}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+G</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Password Generator</h2>
          <ShortcutsModal pageName="Password Generator" shortcuts={[{ keys: ["Ctrl", "Shift", "G"], description: "Generate passwords" }]} />
        </div>
        <div className="flex" role="tablist">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Options
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Passwords
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left panel — options */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="options-label">
          <div className="shrink-0 border-b border-border px-4 py-3"><span className="text-sm font-medium" id="options-label">Options</span></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            <div className="space-y-3" role="group" aria-labelledby="length-label">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" id="length-label">Length</Label>
                <span className="text-sm font-mono font-medium tabular-nums w-8 text-right" aria-live="polite">{length}</span>
              </div>
              <Slider
                min={8} max={128} step={1} value={[length]}
                onValueChange={([v]) => { setLength(v); announceToScreenReader(`Length set to ${v}`) }}
                aria-label={`Password length: ${length} characters`}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground"><span>8</span><span>128</span></div>
            </div>

            <div className="space-y-3" role="group" aria-labelledby="charset-label">
              <Label className="text-sm font-medium" id="charset-label">Character sets</Label>
              <div className="space-y-2.5">
                {[
                  { label: "Uppercase (A–Z)", value: uppercase, set: setUppercase, key: "uppercase" },
                  { label: "Lowercase (a–z)", value: lowercase, set: setLowercase, key: "lowercase" },
                  { label: "Numbers (0–9)", value: numbers, set: setNumbers, key: "numbers" },
                  { label: "Symbols (!@#$...)", value: symbols, set: setSymbols, key: "symbols" },
                ].map(({ label, value, set, key }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground font-normal cursor-pointer" htmlFor={`switch-${key}`}>{label}</Label>
                    <Switch checked={value} onCheckedChange={(checked) => { set(checked); announceToScreenReader(`${label} ${checked ? "enabled" : "disabled"}`) }} id={`switch-${key}`} aria-label={label} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3" role="group" aria-labelledby="options-label-2">
              <Label className="text-sm font-medium" id="options-label-2">Options</Label>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-muted-foreground font-normal" htmlFor="switch-ambiguous">Exclude similar characters</Label>
                  <p className="text-xs text-muted-foreground/60">Removes l, 1, I, O, 0</p>
                </div>
                <Switch checked={excludeAmbiguous} onCheckedChange={(checked) => { setExcludeAmbiguous(checked); announceToScreenReader(checked ? "Exclude similar enabled" : "Exclude similar disabled") }} id="switch-ambiguous" />
              </div>
            </div>

            <div className="space-y-3" role="group" aria-labelledby="quantity-label">
              <Label className="text-sm font-medium" id="quantity-label">Quantity</Label>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Password quantity">
                {quantities.map(q => (
                  <button key={q} onClick={() => { setQuantity(q); announceToScreenReader(`Quantity set to ${q}`) }}
                    role="radio" aria-checked={quantity === q}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${quantity === q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
            {!charset && <p className="text-center text-xs text-red-500" role="alert">Select at least one character set</p>}
          </div>
        </div>

        {/* Right panel — results */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="results-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="results-label">Results</span>
            {passwords.length > 1 && (
              <Button variant="ghost" size="sm" onClick={copyAll} className="h-7 text-xs" aria-label={copiedAll ? "Copied all passwords" : "Copy all passwords"}>
                {copiedAll ? <Check className="mr-1.5 h-3 w-3" aria-hidden="true" /> : <Copy className="mr-1.5 h-3 w-3" aria-hidden="true" />}
                {copiedAll ? "Copied!" : "Copy All"}
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {passwords.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                <div className="rounded-full border border-border bg-muted/50 p-4">
                  <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">No passwords yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click Generate or press Ctrl+Shift+G</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Strength:</span>
                  <span className={`text-xs font-medium ${strength.color}`} role="status" aria-live="polite">{strength.label}</span>
                </div>
                {passwords.map((pw, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5" role="listitem" aria-label={`Password ${i + 1}`}>
                    <span className="flex-1 font-mono text-sm break-all select-all">{pw}</span>
                    <button onClick={() => copyOne(i)} aria-label={copiedIndex === i ? "Password copied" : `Copy password ${i + 1}`}
                      className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      {copiedIndex === i ? <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={() => { generate(); setActiveTab("output") }} disabled={!charset} aria-label="Generate passwords">
          <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Generate{quantity > 1 ? ` ${quantity}` : ""}
        </Button>
      </div>
    </div>
  )
}
