"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Shield, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

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

const shortcuts = [
  { keys: ["?"], description: "Toggle this panel" },
]

export default function JwtDecoder() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  let decoded: ReturnType<typeof parseJwt> | null = null
  let parseError = ""
  if (input.trim()) {
    try { decoded = parseJwt(input); announceToScreenReader("JWT decoded successfully") }
    catch (e) { parseError = e instanceof Error ? e.message : "Invalid JWT"; announceToScreenReader(parseError) }
  }

  const expiry = decoded ? getExpiryInfo(decoded.payload) : null

  const copy = useCallback((value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    announceToScreenReader(`${key} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const sections = decoded
    ? [
        { label: "Header", key: "header", data: decoded.header },
        { label: "Payload", key: "payload", data: decoded.payload },
      ]
    : []

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">JWT Decoder</span>
        {expiry && (
          <Badge
            variant={expiry.expired ? "destructive" : "secondary"}
            className={expiry.expired ? "" : "text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-300"}
            role="status"
            aria-live="polite"
          >
            {expiry.expired ? "Token Expired" : "Token Valid"}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="JWT Decoder" shortcuts={shortcuts} />
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">JWT Decoder</h2>
          <ShortcutsModal pageName="JWT Decoder" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            JWT Token
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Decoded
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden" role="main" aria-label="JWT Decoder tool">

        {/* Left — Input */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="input-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="input-panel-label">JWT Token</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); announceToScreenReader("Token input updated") }}
            placeholder={"Paste your JWT token here\n\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."}
            className="flex-1 resize-none border-0 rounded-none font-mono text-xs focus-visible:ring-0 break-all leading-relaxed p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="JWT token input"
            id="jwt-input"
          />
          {input.trim() && !parseError && decoded && (
            <div className="shrink-0 border-t border-border px-4 py-3 space-y-2" role="status" aria-live="polite">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" aria-hidden="true" />Header</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" aria-hidden="true" />Payload</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" aria-hidden="true" />Signature</span>
              </div>
              {expiry && (
                <p className={`text-xs ${expiry.expired ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                  {expiry.expired ? "Expired" : "Expires"}: {expiry.date.toLocaleString()}
                </p>
              )}
              {decoded.payload.iat && typeof decoded.payload.iat === "number" && (
                <p className="text-xs text-muted-foreground">Issued: {new Date((decoded.payload.iat as number) * 1000).toLocaleString()}</p>
              )}
            </div>
          )}
          {parseError && (
            <div className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-2 text-destructive text-xs" role="alert">
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />{parseError}
            </div>
          )}
          <div className="md:hidden h-[60px] shrink-0" aria-hidden="true" />
        </div>

        {/* Right — Decoded */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="decoded-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="decoded-panel-label">Decoded</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sections.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground" role="status">
                Paste a JWT token to decode it
              </div>
            ) : (
              <>
                {sections.map(({ label, key, data }) => (
                  <div key={key} className="rounded-lg border border-border overflow-hidden" role="group" aria-labelledby={`${key}-label`}>
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                      <span className="text-xs font-semibold uppercase tracking-wider" id={`${key}-label`}>{label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        onClick={() => copy(JSON.stringify(data, null, 2), key)}
                        aria-label={copied === key ? `${label} copied to clipboard` : `Copy ${label} to clipboard`}
                      >
                        {copied === key ? <Check className="h-3 w-3 mr-1" aria-hidden="true" /> : <Copy className="h-3 w-3 mr-1" aria-hidden="true" />}
                        {copied === key ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <pre
                      className="p-4 text-xs font-mono overflow-x-auto bg-muted/10 leading-relaxed"
                      role="textbox"
                      aria-readonly="true"
                      aria-label={`${label} JSON data`}
                    >{JSON.stringify(data, null, 2)}</pre>
                  </div>
                ))}
                <div className="rounded-lg border border-border overflow-hidden" role="group" aria-labelledby="signature-label">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider" id="signature-label">Signature</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" aria-hidden="true" />Cannot verify without secret
                    </div>
                  </div>
                  <pre
                    className="p-4 text-xs font-mono overflow-x-auto bg-muted/10 break-all whitespace-pre-wrap leading-relaxed"
                    role="textbox"
                    aria-readonly="true"
                    aria-label="JWT signature"
                  >{decoded?.signature}</pre>
                </div>
              </>
            )}

            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Paste your JWT token into the left panel. It decodes automatically as you type.</li>
                <li>The <span className="text-foreground font-medium">Header</span> shows the signing algorithm and token type. The <span className="text-foreground font-medium">Payload</span> shows the claims such as user ID, roles, and expiry time.</li>
                <li>The expiry status appears at the bottom of the input panel and as a badge in the toolbar on desktop.</li>
                <li>Use the <span className="text-foreground font-medium">Copy</span> buttons to copy the Header or Payload as formatted JSON.</li>
              </ol>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tips</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>A JWT has three dot-separated parts: header, payload, and signature.</li>
                  <li>The signature cannot be verified without the secret key. Never share your secret key.</li>
                  <li>The <span className="text-foreground font-medium">exp</span> claim is Unix timestamp (seconds). The <span className="text-foreground font-medium">iat</span> claim is the issued-at time.</li>
                  <li>Everything runs in your browser. Nothing is sent to a server.</li>
                </ul>
              </div>
            </div>
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        {input.trim() && (
          <Button
            size="sm"
            variant="ghost"
            className="h-11 px-4"
            onClick={() => { setInput(""); announceToScreenReader("Input cleared") }}
            aria-label="Clear JWT token input"
          >
            Clear
          </Button>
        )}
      </div>

    </div>
  )
}
