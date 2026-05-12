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
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

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
    announceToScreenReader("QR code downloaded")
    setTimeout(() => setDownloaded(false), 2000)
  }, [qrDataUrl, announceToScreenReader])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === "d")) {
        e.preventDefault()
        download()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [download])

  const handleInputTypeChange = useCallback((id: InputType) => {
    setInputType(id)
    announceToScreenReader(`Content type changed to ${id}`)
  }, [announceToScreenReader])

  const handleSizeChange = useCallback((s: number) => {
    setSize(s)
    announceToScreenReader(`Size changed to ${s} pixels`)
  }, [announceToScreenReader])

  const handleErrorLevelChange = useCallback((id: ErrorLevel) => {
    setErrorLevel(id)
    announceToScreenReader(`Error correction level changed to ${id}`)
  }, [announceToScreenReader])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "D"], description: "Download QR code" },
  ]

  return (
    <>
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">QR Code Generator</h2>
          <p className="text-muted-foreground">100% in-browser · No data sent anywhere</p>
        </div>
        <ShortcutsModal pageName="QR Code Generator" shortcuts={shortcuts} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
      {/* Left panel — options */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Input type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Content type</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Content type options">
              {INPUT_TYPES.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleInputTypeChange(id)}
                  role="radio"
                  aria-checked={inputType === id}
                  aria-label={`${label} content type`}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
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
            <Label id="content-label" className="text-sm font-medium">Content</Label>
            {inputType === "url" && (
              <Input
                placeholder="https://example.com"
                value={text}
                onChange={e => setText(e.target.value)}
                aria-labelledby="content-label"
              />
            )}
            {inputType === "text" && (
              <textarea
                className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Enter any text..."
                value={text}
                onChange={e => setText(e.target.value)}
                aria-labelledby="content-label"
              />
            )}
            {inputType === "email" && (
              <Input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-labelledby="content-label"
              />
            )}
            {inputType === "phone" && (
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                aria-labelledby="content-label"
              />
            )}
            {inputType === "wifi" && (
              <div className="space-y-3">
                <Input 
                  placeholder="Network name (SSID)" 
                  value={ssid} 
                  onChange={e => setSsid(e.target.value)} 
                  aria-label="Wi-Fi network name (SSID)"
                />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  aria-label="Wi-Fi password"
                />
                <div className="flex gap-2" role="group" aria-label="Wi-Fi security type">
                  {(["WPA", "WEP", "nopass"] as WifiSecurity[]).map(s => (
                    <button
                      key={s}
                      onClick={() => { setSecurity(s); announceToScreenReader(`Security type changed to ${s === "nopass" ? "No password" : s}`) }}
                      role="radio"
                      aria-checked={security === s}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
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
                  <Label htmlFor="hidden-network" className="text-sm text-muted-foreground font-normal">Hidden network</Label>
                  <Switch 
                    id="hidden-network"
                    checked={hidden} 
                    onCheckedChange={(v) => { setHidden(v); announceToScreenReader(v ? "Hidden network enabled" : "Hidden network disabled") }} 
                    aria-label="Hidden network"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Size (px)</Label>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="QR code size options">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => handleSizeChange(s)}
                  role="radio"
                  aria-checked={size === s}
                  aria-label={`${s} pixels`}
                  className={`rounded-md border px-2 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
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
                  onChange={e => { setFgColor(e.target.value); announceToScreenReader(`Foreground color changed to ${e.target.value}`) }}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label="Foreground color"
                />
                <span className="text-xs text-muted-foreground">Foreground</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => { setBgColor(e.target.value); announceToScreenReader(`Background color changed to ${e.target.value}`) }}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label="Background color"
                />
                <span className="text-xs text-muted-foreground">Background</span>
              </div>
            </div>
          </div>

          {/* Error correction */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Error correction</Label>
            <p className="text-xs text-muted-foreground" id="error-correction-desc">Higher = more resilient if QR is damaged, but denser pattern</p>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Error correction level options" aria-describedby="error-correction-desc">
              {ERROR_LEVELS.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => handleErrorLevelChange(id)}
                  title={desc}
                  role="radio"
                  aria-checked={errorLevel === id}
                  aria-label={`${label} - ${desc}`}
                  className={`rounded-md border px-2 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
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
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-4" role="region" aria-label="QR code preview">
              <img
                src={qrDataUrl}
                alt="Generated QR code"
                className="rounded-lg border border-border"
                style={{ width: Math.min(size, 280), height: Math.min(size, 280) }}
              />
              <p className="text-xs text-muted-foreground text-center max-w-[240px] break-all" aria-label={`Content: ${content}`}>{content}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center" role="status">
              <div className="rounded-full border border-border bg-muted/50 p-4" aria-hidden="true">
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
          <Button 
            className="w-full gap-2" 
            onClick={download} 
            disabled={!qrDataUrl}
            aria-label={downloaded ? "QR code downloaded" : "Download QR code as PNG"}
          >
            {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            <span>{downloaded ? "Downloaded!" : "Download PNG"}</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
              <span>Ctrl</span>
              <span>Shift</span>
              <span>D</span>
            </kbd>
          </Button>
        </div>
      </div>

      </div>
    </div>
    </>
  )
}
