"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, Check, QrCode, Wifi, Mail, Phone, Link, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type InputType = "url" | "text" | "email" | "phone" | "wifi"
type ErrorLevel = "L" | "M" | "Q" | "H"
type WifiSecurity = "WPA" | "WEP" | "nopass"

function buildContent(
  type: InputType,
  fields: {
    text: string; email: string; phone: string
    ssid: string; password: string; security: WifiSecurity; hidden: boolean
  }
): string {
  switch (type) {
    case "url":
    case "text": return fields.text
    case "email": return `mailto:${fields.email}`
    case "phone": return `tel:${fields.phone}`
    case "wifi": return `WIFI:T:${fields.security};S:${fields.ssid};P:${fields.password};H:${fields.hidden};;`
  }
}

const INPUT_TYPES: { id: InputType; label: string; icon: React.ReactNode }[] = [
  { id: "url", label: "URL", icon: <Link className="h-3.5 w-3.5" /> },
  { id: "text", label: "Text", icon: <Type className="h-3.5 w-3.5" /> },
  { id: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
  { id: "phone", label: "Phone", icon: <Phone className="h-3.5 w-3.5" /> },
  { id: "wifi", label: "Wi-Fi", icon: <Wifi className="h-3.5 w-3.5" /> },
]

const SIZES = [128, 256, 512, 1024]
const ERROR_LEVELS: { id: ErrorLevel; label: string; desc: string }[] = [
  { id: "L", label: "L", desc: "Low" },
  { id: "M", label: "M", desc: "Medium" },
  { id: "Q", label: "Q", desc: "High" },
  { id: "H", label: "H", desc: "Max" },
]

export function QrCodeGenerator() {
  const [inputType, setInputType] = useState<InputType>("url")
  const [text, setText] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [ssid, setSsid] = useState("")
  const [password, setPassword] = useState("")
  const [security, setSecurity] = useState<WifiSecurity>("WPA")
  const [hidden, setHidden] = useState(false)
  const [size, setSize] = useState(256)
  const [fgColor, setFgColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>("M")
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)

  const content = buildContent(inputType, { text, email, phone, ssid, password, security, hidden })

  useEffect(() => {
    if (!content.trim()) { setQrDataUrl(null); return }
    const timer = setTimeout(async () => {
      try {
        const QRCode = (await import("qrcode")).default
        const url = await QRCode.toDataURL(content, {
          width: size,
          margin: 2,
          color: { dark: fgColor, light: bgColor },
          errorCorrectionLevel: errorLevel,
        })
        setQrDataUrl(url)
      } catch {
        setQrDataUrl(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [content, size, fgColor, bgColor, errorLevel])

  const download = useCallback(() => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `qrcode-${Date.now()}.png`
    a.click()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }, [qrDataUrl])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        download()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [download])

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel — options */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <QrCode className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">QR Code Generator</h1>
              <p className="text-xs text-muted-foreground">100% in-browser · No data sent anywhere</p>
            </div>
          </div>

          {/* Input type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Content type</Label>
            <div className="flex flex-wrap gap-2">
              {INPUT_TYPES.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setInputType(id)}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    inputType === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Input fields */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Content</Label>
            {inputType === "url" && (
              <Input
                placeholder="https://example.com"
                value={text}
                onChange={e => setText(e.target.value)}
              />
            )}
            {inputType === "text" && (
              <textarea
                className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Enter any text..."
                value={text}
                onChange={e => setText(e.target.value)}
              />
            )}
            {inputType === "email" && (
              <Input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            )}
            {inputType === "phone" && (
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            )}
            {inputType === "wifi" && (
              <div className="space-y-3">
                <Input placeholder="Network name (SSID)" value={ssid} onChange={e => setSsid(e.target.value)} />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <div className="flex gap-2">
                  {(["WPA", "WEP", "nopass"] as WifiSecurity[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSecurity(s)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        security === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {s === "nopass" ? "No password" : s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground font-normal">Hidden network</Label>
                  <Switch checked={hidden} onCheckedChange={setHidden} />
                </div>
              </div>
            )}
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Size (px)</Label>
            <div className="grid grid-cols-4 gap-2">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-md border px-2 py-1.5 text-sm font-medium transition-colors ${
                    size === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Colors</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={e => setFgColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <span className="text-xs text-muted-foreground">Foreground</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <span className="text-xs text-muted-foreground">Background</span>
              </div>
            </div>
          </div>

          {/* Error correction */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Error correction</Label>
            <p className="text-xs text-muted-foreground">Higher = more resilient if QR is damaged, but denser pattern</p>
            <div className="grid grid-cols-4 gap-2">
              {ERROR_LEVELS.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setErrorLevel(id)}
                  title={desc}
                  className={`rounded-md border px-2 py-1.5 text-sm font-medium transition-colors ${
                    errorLevel === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — preview */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="rounded-lg border border-border"
                style={{ width: Math.min(size, 280), height: Math.min(size, 280) }}
              />
              <p className="text-xs text-muted-foreground text-center max-w-[240px] break-all">{content}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <QrCode className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No QR code yet</p>
                <p className="text-xs text-muted-foreground mt-1">Fill in the content on the left</p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky download button */}
        <div className="shrink-0 border-t border-border p-4">
          <Button className="w-full" onClick={download} disabled={!qrDataUrl}>
            {downloaded ? <Check className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            {downloaded ? "Downloaded!" : "Download PNG"}
          </Button>
        </div>
      </div>

      <ShortcutsModal
        pageName="QR Code Generator"
        shortcuts={[
          { keys: ["Ctrl", "D"], description: "Download QR code" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
