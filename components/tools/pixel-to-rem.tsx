"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const TABLE_PX = [4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128]

function round(n: number) {
  return parseFloat(n.toFixed(4)).toString()
}

export default function PixelToRem() {
  const [base, setBase] = useState(16)
  const [px, setPx] = useState("")
  const [rem, setRem] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const handlePxChange = (v: string) => {
    setPx(v)
    const n = parseFloat(v)
    setRem(isNaN(n) || !base ? "" : round(n / base))
  }

  const handleRemChange = (v: string) => {
    setRem(v)
    const n = parseFloat(v)
    setPx(isNaN(n) || !base ? "" : round(n * base))
  }

  const handleBaseChange = (v: string) => {
    const n = parseInt(v) || 16
    setBase(n)
    if (px) setRem(round(parseFloat(px) / n))
  }

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Pixel → REM Converter</h1>
          <p className="text-sm text-muted-foreground">Convert between px and rem units based on your root font size.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Converter */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Converter</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Base font size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Root Font Size</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={base}
                  onChange={(e) => handleBaseChange(e.target.value)}
                  className="w-24 font-mono"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">px (browser default is 16px)</span>
              </div>
            </div>

            {/* Conversion inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Pixels</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={px}
                    onChange={(e) => handlePxChange(e.target.value)}
                    placeholder="16"
                    className="font-mono pr-9"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">px</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">REM</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={rem}
                    onChange={(e) => handleRemChange(e.target.value)}
                    placeholder="1"
                    className="font-mono pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">rem</span>
                </div>
              </div>
            </div>

            {px && rem && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm">
                    <span className="text-muted-foreground">{px}px =</span>{" "}
                    <strong>{rem}rem</strong>
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => copy(`${rem}rem`, "result")}>
                    {copied === "result" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied === "result" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">at {base}px root font size</p>
              </div>
            )}

            {/* Common presets */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {[8, 12, 16, 20, 24, 32, 48, 64].map(p => (
                  <button
                    key={p}
                    onClick={() => handlePxChange(String(p))}
                    className="text-xs px-2.5 py-1 rounded border border-border font-mono hover:border-primary/50 transition-colors"
                  >
                    {p}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Reference table */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Reference Table ({base}px base)</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 border-b border-border backdrop-blur-sm">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">px</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">rem</th>
                  <th className="w-12 px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {TABLE_PX.map((p) => {
                  const r = round(p / base)
                  const isActive = parseFloat(px) === p
                  return (
                    <tr
                      key={p}
                      className={`border-b border-border/50 cursor-pointer transition-colors ${isActive ? "bg-primary/5" : "hover:bg-muted/30"}`}
                      onClick={() => handlePxChange(String(p))}
                    >
                      <td className="px-4 py-2.5 font-mono">{p}px</td>
                      <td className="px-4 py-2.5 font-mono">{r}rem</td>
                      <td className="px-2 py-2.5">
                        <Button
                          variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); copy(`${r}rem`, `row-${p}`) }}
                        >
                          {copied === `row-${p}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
