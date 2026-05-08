"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const urgent = timeLeft <= 5
  const pct = (timeLeft / 30) * 100

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">TOTP / 2FA Generator</h2>
        <p className="text-muted-foreground">Generate TOTP codes from a base32 secret. Compatible with Google Authenticator. Nothing leaves your browser.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Secret Key</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm">Base32 Secret (from your 2FA setup screen)</Label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="JBSWY3DPEHPK3PXP"
                className="font-mono tracking-widest text-center text-base"
              />
              {error
                ? <p className="text-xs text-destructive">{error}</p>
                : <p className="text-xs text-muted-foreground">The base32 string shown during 2FA account setup (spaces are ignored)</p>
              }
            </div>
            <Button variant="outline" className="w-full" onClick={() => setSecret(DEMO_SECRET)}>
              Load Demo Secret
            </Button>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Settings</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Algorithm", "HMAC-SHA1"], ["Time step", "30 seconds"], ["Digits", "6"], ["Standard", "RFC 6238"]].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-mono font-medium">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Code */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Current Code</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
            {code ? (
              <>
                <div className="text-center">
                  <div className={`text-7xl font-bold font-mono tracking-[0.25em] tabular-nums transition-colors ${urgent ? "text-destructive" : ""}`}>
                    {code.slice(0, 3)}&nbsp;{code.slice(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Valid for {timeLeft} more seconds</p>
                </div>
                <div className="w-full max-w-xs space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Time remaining</span>
                    <span className={`font-mono font-medium ${urgent ? "text-destructive" : ""}`}>{timeLeft}s</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-[width] duration-1000 ${urgent ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Button onClick={copy} size="lg" className="w-full max-w-xs">
                  {copied ? <Check className="h-5 w-5 mr-2" /> : <Copy className="h-5 w-5 mr-2" />}
                  {copied ? "Copied!" : "Copy Code"}
                </Button>
                {nextCode && (
                  <div className="rounded-lg border border-border px-8 py-4 text-center">
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
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-3">
            <span>TOTP · RFC 6238</span>
            <span>HMAC-SHA1 · 30s · 6 digits</span>
          </div>
        </div>
      </div>
    </div>
  )
}
