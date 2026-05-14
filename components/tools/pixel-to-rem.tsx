"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

const TABLE_PX = [4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128]

function round(n: number) {
  return parseFloat(n.toFixed(4)).toString()
}

export default function PixelToRem() {
  const [base, setBase] = useState(16)
  const [px, setPx] = useState("")
  const [rem, setRem] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const handlePxChange = useCallback((v: string) => {
    setPx(v);
    const n = parseFloat(v);
    setRem(isNaN(n) || !base ? "" : round(n / base))
    if (!isNaN(n) && base) announceToScreenReader(`${v} pixels = ${round(n / base)} rem`)
  }, [base, announceToScreenReader])

  const handleRemChange = useCallback((v: string) => {
    setRem(v);
    const n = parseFloat(v);
    setPx(isNaN(n) || !base ? "" : round(n * base))
    if (!isNaN(n) && base) announceToScreenReader(`${v} rem = ${round(n * base)} pixels`)
  }, [base, announceToScreenReader])

  const handleBaseChange = useCallback((v: string) => {
    const n = parseInt(v) || 16;
    setBase(n);
    if (px) setRem(round(parseFloat(px) / n))
    announceToScreenReader(`Root font size set to ${n} pixels`)
  }, [px, announceToScreenReader])

  const copy = useCallback((value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    announceToScreenReader(`Copied: ${value}`)
    setTimeout(() => setCopied(null), 2000)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c" && px && rem) {
        e.preventDefault()
        copy(`${rem}rem`, "result")
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [px, rem, copy])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Copy result" },
  ]

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-1 flex-col min-h-0">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Pixel → REM Converter</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Pixel to Rem" shortcuts={shortcuts} />
            {px && rem && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(`${rem}rem`, "result")}
                aria-label="Copy result to clipboard"
              >
                {copied === "result" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied === "result" ? "Copied!" : "Copy Result"}
                <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
              </Button>
            )}
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Pixel → REM</h2>
            <ShortcutsModal pageName="Pixel to Rem" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Converter
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Reference Table
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left — Converter */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-sm font-medium">Converter</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="base-size" className="text-sm font-medium">Root Font Size</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="base-size"
                      type="number"
                      value={base}
                      onChange={(e) => handleBaseChange(e.target.value)}
                      className="w-24 font-mono"
                      min={1}
                      aria-describedby="base-size-desc"
                    />
                    <span id="base-size-desc" className="text-sm text-muted-foreground">px (browser default is 16px)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="px-input" className="text-sm">Pixels</Label>
                    <div className="relative">
                      <Input
                        id="px-input"
                        type="number"
                        value={px}
                        onChange={(e) => handlePxChange(e.target.value)}
                        placeholder="16"
                        className="font-mono pr-9"
                        aria-label="Pixels value"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">px</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rem-input" className="text-sm">REM</Label>
                    <div className="relative">
                      <Input
                        id="rem-input"
                        type="number"
                        value={rem}
                        onChange={(e) => handleRemChange(e.target.value)}
                        placeholder="1"
                        className="font-mono pr-12"
                        aria-label="REM value"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">rem</span>
                    </div>
                  </div>
                </div>

                {px && rem && (
                  <div
                    className="rounded-lg border border-primary/20 bg-primary/5 p-4"
                    role="region"
                    aria-label="Conversion result"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm">
                        <span className="text-muted-foreground">{px}px =</span>{" "}
                        <strong>{rem}rem</strong>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(`${rem}rem`, "result")}
                        aria-label="Copy result to clipboard"
                      >
                        {copied === "result" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied === "result" ? "Copied!" : "Copy"}
                        <kbd className="ml-2 hidden md:inline pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted font-mono text-[10px] font-medium opacity-100">
                          <span className="text-xs">Ctrl</span>
                          <span>Shift</span>
                          <span>C</span>
                        </kbd>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">at {base}px root font size</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick Presets</Label>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Quick pixel presets">
                    {[8, 12, 16, 20, 24, 32, 48, 64].map(p => (
                      <button
                        key={p}
                        onClick={() => handlePxChange(String(p))}
                        className="text-xs px-2.5 py-1 rounded border border-border font-mono hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition-colors"
                        aria-label={`Set ${p} pixels`}
                      >
                        {p}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          {/* Right — Reference Table */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`}>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-sm font-medium">Reference Table ({base}px base)</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm" role="table" aria-label={`REM conversion table with ${base}px base`}>
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th scope="col" className="text-left px-4 py-2.5 font-medium text-muted-foreground">px</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-medium text-muted-foreground">rem</th>
                      <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Copy</span></th>
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
                          onKeyDown={(e) => e.key === "Enter" && handlePxChange(String(p))}
                          tabIndex={0}
                          role="row"
                          aria-label={`${p} pixels equals ${r} rem`}
                        >
                          <td className="px-4 py-2.5 font-mono">{p}px</td>
                          <td className="px-4 py-2.5 font-mono">{r}rem</td>
                          <td className="px-2 py-2.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 focus:outline-none focus:ring-2 focus:ring-primary/50"
                              onClick={(e) => { e.stopPropagation(); copy(`${r}rem`, `row-${p}`) }}
                              aria-label={`Copy ${r} rem`}
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

        {/* MOBILE: bottom action bar */}
        {px && rem && (
          <div
            className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex-1" />
            <Button
              size="sm"
              className="h-11 px-4"
              onClick={() => copy(`${rem}rem`, "result")}
              aria-label="Copy result to clipboard"
            >
              {copied === "result" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied === "result" ? "Copied!" : "Copy Result"}
            </Button>
          </div>
        )}

      </div>
    </>
  )
}
