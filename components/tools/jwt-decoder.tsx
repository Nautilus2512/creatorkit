"use client"

import { useState } from "react"
import { Copy, Check, Shield, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/")
  const pad = 4 - (str.length % 4)
  if (pad !== 4) str += "=".repeat(pad)
  return decodeURIComponent(
    Array.from(atob(str))
      .map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  )
}

function parseJwt(token: string) {
  const parts = token.trim().split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT: expected 3 dot-separated parts")
  const header = JSON.parse(base64UrlDecode(parts[0]))
  const payload = JSON.parse(base64UrlDecode(parts[1]))
  return { header, payload, signature: parts[2] }
}

function getExpiryInfo(payload: Record<string, unknown>) {
  if (typeof payload.exp !== "number") return null
  const exp = payload.exp as number
  const now = Math.floor(Date.now() / 1000)
  return { expired: now > exp, date: new Date(exp * 1000) }
}

export default function JwtDecoder() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  let decoded: ReturnType<typeof parseJwt> | null = null
  let parseError = ""
  if (input.trim()) {
    try { decoded = parseJwt(input) }
    catch (e) { parseError = e instanceof Error ? e.message : "Invalid JWT" }
  }

  const expiry = decoded ? getExpiryInfo(decoded.payload) : null

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const sections = decoded
    ? [
        { label: "Header", key: "header", data: decoded.header },
        { label: "Payload", key: "payload", data: decoded.payload },
      ]
    : []

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">JWT Decoder</h2>
          <p className="text-muted-foreground">Decode and inspect JSON Web Tokens — runs entirely in your browser</p>
        </div>
        {expiry && (
          <Badge variant={expiry.expired ? "destructive" : "secondary"} className={expiry.expired ? "" : "text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-300"}>
            {expiry.expired ? "Token Expired" : "Token Valid"}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">JWT Token</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Paste your JWT token here\n\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."}
            className="flex-1 resize-none border-0 rounded-none font-mono text-xs focus-visible:ring-0 break-all leading-relaxed p-4"
          />
          {input.trim() && !parseError && decoded && (
            <div className="shrink-0 border-t border-border px-4 py-3 space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Header</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Payload</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Signature</span>
              </div>
              {expiry && (
                <p className={`text-xs ${expiry.expired ? "text-destructive" : "text-green-700"}`}>
                  {expiry.expired ? "⚠ Expired" : "✓ Expires"}: {expiry.date.toLocaleString()}
                </p>
              )}
              {decoded.payload.iat && typeof decoded.payload.iat === "number" && (
                <p className="text-xs text-muted-foreground">Issued: {new Date((decoded.payload.iat as number) * 1000).toLocaleString()}</p>
              )}
            </div>
          )}
          {parseError && (
            <div className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-3 w-3 shrink-0" />{parseError}
            </div>
          )}
        </div>

        {/* Right — Decoded */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Decoded</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sections.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Paste a JWT token to decode it
              </div>
            ) : (
              <>
                {sections.map(({ label, key, data }) => (
                  <div key={key} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copy(JSON.stringify(data, null, 2), key)}>
                        {copied === key ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copied === key ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <pre className="p-4 text-xs font-mono overflow-x-auto bg-muted/10 leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
                  </div>
                ))}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider">Signature</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />Cannot verify without secret
                    </div>
                  </div>
                  <pre className="p-4 text-xs font-mono overflow-x-auto bg-muted/10 break-all whitespace-pre-wrap leading-relaxed">{decoded?.signature}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
