"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const DEMO_SECRET = "JBSWY3DPEHPK3PXP"

function base32Decode(input: string): Uint8Array {
  const s = input.toUpperCase().replace(/[\s=]/g, "")
  let bits = 0, val = 0
  const out: number[] = []
  for (const ch of s) {
    const idx = BASE32.indexOf(ch)
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`)
    val = (val << 5) | idx
    bits += 5
    if (bits >= 8) { bits -= 8; out.push((val >> bits) & 0xff) }
  }
  return new Uint8Array(out)
}

async function computeTotp(secret: string, offset = 0): Promise<string> {
  const keyBytes = base32Decode(secret) as Uint8Array<ArrayBuffer>
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"])
  const step = Math.floor(Date.now() / 30000) + offset
  const counter = new ArrayBuffer(8)
  new DataView(counter).setUint32(4, step, false)
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter))
  const offset2 = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset2] & 0x7f) << 24) | (hmac[offset2 + 1] << 16) | (hmac[offset2 + 2] << 8) | hmac[offset2 + 3]
  return (code % 1_000_000).toString().padStart(6, "0")
}

export default function TotpGenerator() {
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [nextCode, setNextCode] = useState("")
  const [timeLeft, setTimeLeft] = useState(30)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const refresh = useCallback(async (s: string) => {
    if (!s.trim()) { setCode(""); setNextCode(""); return }
    try {
      const [cur, nxt] = await Promise.all([computeTotp(s, 0), computeTotp(s, 1)])
      setCode(cur); setNextCode(nxt); setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid secret")
      setCode(""); setNextCode("")
    }
  }, [])

  useEffect(() => { refresh(secret) }, [secret, refresh])

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000)
      const left = 30 - (now % 30)
      setTimeLeft(left)
      if (left === 30 && secret.trim()) refresh(secret)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [secret, refresh])

  const copy = useCallback(() => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    announceToScreenReader(`Code ${code} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }, [code, announceToScreenReader])

  const loadDemo = useCallback(() => {
    setSecret(DEMO_SECRET)
    setActiveTab("output")
    announceToScreenReader("Demo secret loaded")
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c": if (code) { e.preventDefault(); copy() } break
          case "d": if (secret.trim()) { e.preventDefault(); loadDemo() } break
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [code, copy, secret, loadDemo])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "C"], description: "Copy current code" },
    { keys: ["Ctrl", "Shift", "D"], description: "Load demo secret" },
  ]

  const urgent = timeLeft <= 5
  const pct = (timeLeft / 30) * 100

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <div className="flex h-full flex-col">

        {/* ── Desktop: top action bar ── */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="TOTP controls">
          <span className="text-sm font-semibold shrink-0 mr-1">TOTP / 2FA Generator</span>
          <Button variant="ghost" size="sm" onClick={loadDemo} aria-label="Load demo secret">
            Load Demo
            <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="TOTP Generator" shortcuts={shortcuts} />
            <Button size="sm" onClick={copy} disabled={!code} aria-label={copied ? "Code copied" : "Copy current TOTP code"}>
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy Code"}
              <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
          </div>
        </div>

        {/* ── Mobile: compact header + tab switcher ── */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">TOTP / 2FA Generator</h2>
            <ShortcutsModal pageName="TOTP Generator" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Secret Key
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Current Code
            </button>
          </div>
        </div>

        {/* ── Panels ── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region" aria-label="Secret key input">
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="secret-input" className="text-sm">Base32 Secret (from your 2FA setup screen)</Label>
                <Input
                  id="secret-input"
                  value={secret}
                  onChange={(e) => { setSecret(e.target.value.toUpperCase().replace(/\s/g, "")); if (e.target.value) setActiveTab("output"); announceToScreenReader("Secret updated") }}
                  placeholder="JBSWY3DPEHPK3PXP"
                  className="font-mono tracking-widest text-center text-base"
                  aria-describedby="secret-hint"
                />
                <span id="secret-hint" className="sr-only">{error ? `Error: ${error}` : "The base32 string shown during 2FA account setup"}</span>
                {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : <p className="text-xs text-muted-foreground">The base32 string shown during 2FA account setup (spaces are ignored)</p>}
              </div>
              <Button variant="outline" className="w-full focus:outline-none focus:ring-2 focus:ring-primary/50" onClick={loadDemo} aria-label="Load demo secret for testing">
                Load Demo Secret
                <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
              </Button>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Settings</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[["Algorithm", "HMAC-SHA1"], ["Time step", "30 seconds"], ["Digits", "6"], ["Standard", "RFC 6238"]].map(([k, v]) => (
                    <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono font-medium">{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Output panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region" aria-label="TOTP code display">
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 overflow-y-auto">
              {code ? (
                <>
                  <div className="text-center" role="timer" aria-label={`Current TOTP code: ${code}, expires in ${timeLeft} seconds`}>
                    <div className={`text-7xl font-bold font-mono tracking-[0.25em] tabular-nums transition-colors ${urgent ? "text-destructive" : ""}`} aria-hidden="true">
                      {code.slice(0, 3)}&nbsp;{code.slice(3)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2" aria-live="polite">Valid for {timeLeft} more seconds</p>
                  </div>
                  <div className="w-full max-w-xs space-y-1.5" role="group" aria-label="Time remaining">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />Time remaining</span>
                      <span className={`font-mono font-medium ${urgent ? "text-destructive" : ""}`}>{timeLeft}s</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={timeLeft} aria-valuemin={0} aria-valuemax={30}>
                      <div className={`h-full rounded-full transition-[width] duration-1000 ${urgent ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {nextCode && (
                    <div className="rounded-lg border border-border px-8 py-4 text-center" role="region" aria-label={`Next code: ${nextCode}`}>
                      <p className="text-xs text-muted-foreground mb-1">Next code (in {timeLeft}s)</p>
                      <p className="text-3xl font-mono font-medium tracking-[0.25em]">{nextCode.slice(0, 3)}&nbsp;{nextCode.slice(3)}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-3">
                  <div className="text-7xl font-mono text-muted-foreground/15 tracking-[0.25em]">••• •••</div>
                  <p className="text-sm text-muted-foreground">Enter a base32 secret to generate codes</p>
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-border bg-card/95 px-4 py-2 text-xs text-muted-foreground flex gap-3">
              <span>TOTP · RFC 6238</span><span>HMAC-SHA1 · 30s · 6 digits</span>
            </div>
          </div>
        </div>

        {/* ── Mobile: bottom action bar ── */}
        <div
          className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant="ghost" size="sm" className="h-11 px-3 text-xs" onClick={loadDemo}>Demo</Button>
          <div className="flex-1" />
          <Button size="sm" className="h-11 px-4" onClick={copy} disabled={!code} aria-label={copied ? "Copied!" : "Copy code"}>
            {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy Code"}
          </Button>
        </div>

      </div>
    </>
  )
}
