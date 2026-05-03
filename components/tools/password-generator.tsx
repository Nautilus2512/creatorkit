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
  }, [length, charset, quantity])

  const copyOne = (index: number) => {
    navigator.clipboard.writeText(passwords[index])
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(passwords.join("\n"))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        generate()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault()
        generate()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [generate])

  const quantities: (1 | 5 | 10 | 20)[] = [1, 5, 10, 20]

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel — options */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Password Generator</h1>
              <p className="text-xs text-muted-foreground">Cryptographically secure · 100% in-browser</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Length</Label>
              <span className="text-sm font-mono font-medium tabular-nums w-8 text-right">{length}</span>
            </div>
            <Slider
              min={8}
              max={128}
              step={1}
              value={[length]}
              onValueChange={([v]) => setLength(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>8</span>
              <span>128</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Character sets</Label>
            <div className="space-y-2.5">
              {[
                { label: "Uppercase (A–Z)", value: uppercase, set: setUppercase },
                { label: "Lowercase (a–z)", value: lowercase, set: setLowercase },
                { label: "Numbers (0–9)", value: numbers, set: setNumbers },
                { label: "Symbols (!@#$...)", value: symbols, set: setSymbols },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground font-normal cursor-pointer">{label}</Label>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-muted-foreground font-normal">Exclude similar characters</Label>
                <p className="text-xs text-muted-foreground/60">Removes l, 1, I, O, 0</p>
              </div>
              <Switch checked={excludeAmbiguous} onCheckedChange={setExcludeAmbiguous} />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Quantity</Label>
            <div className="grid grid-cols-4 gap-2">
              {quantities.map(q => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    quantity === q
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button className="w-full" onClick={generate} disabled={!charset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate{quantity > 1 ? ` ${quantity} Passwords` : " Password"}
          </Button>
          {!charset && (
            <p className="mt-2 text-center text-xs text-red-500">Select at least one character set</p>
          )}
        </div>
      </div>

      {/* Right panel — results */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {passwords.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No passwords yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click Generate or press Ctrl+Enter</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Strength:</span>
                  <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                </div>
                {passwords.length > 1 && (
                  <Button variant="outline" size="sm" onClick={copyAll} className="h-7 text-xs">
                    {copiedAll ? <Check className="mr-1.5 h-3 w-3" /> : <Copy className="mr-1.5 h-3 w-3" />}
                    {copiedAll ? "Copied!" : "Copy All"}
                  </Button>
                )}
              </div>
              {passwords.map((pw, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                >
                  <span className="flex-1 font-mono text-sm break-all select-all">{pw}</span>
                  <button
                    onClick={() => copyOne(i)}
                    aria-label="Copy password"
                    className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {copiedIndex === i ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ShortcutsModal
        pageName="Password Generator"
        shortcuts={[
          { keys: ["Ctrl", "Enter"], description: "Generate passwords" },
          { keys: ["Ctrl", "G"], description: "Generate passwords" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
