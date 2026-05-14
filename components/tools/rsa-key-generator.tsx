"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Download, RefreshCw, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type KeySize = 2048 | 4096

function toPem(label: string, buffer: ArrayBuffer): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const lines = base64.match(/.{1,64}/g) || []
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`
}

async function generatePair(keySize: KeySize) {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: keySize, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  )
  const [pub, priv] = await Promise.all([
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ])
  return {
    publicKey: toPem("PUBLIC KEY", pub),
    privateKey: toPem("PRIVATE KEY", priv),
  }
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "G"], description: "Generate new keys" },
  { keys: ["Ctrl", "Shift", "P"], description: "Copy public key" },
  { keys: ["Ctrl", "Shift", "L"], description: "Copy private key" },
]

export default function RsaKeyGenerator() {
  const [keySize, setKeySize] = useState<KeySize>(2048)
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const generate = useCallback(async () => {
    setGenerating(true)
    setKeys(null)
    try {
      const newKeys = await generatePair(keySize)
      setKeys(newKeys)
      announceToScreenReader(`${keySize}-bit key pair generated successfully`)
    } catch (e) {
      console.error(e)
      announceToScreenReader("Error generating key pair")
    }
    setGenerating(false)
  }, [keySize, announceToScreenReader])

  const copy = useCallback((value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    announceToScreenReader(key === "pub" ? "Public key copied" : "Private key copied")
    setTimeout(() => setCopied(null), 2000)
  }, [announceToScreenReader])

  const download = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader(`${filename} downloaded`)
  }, [announceToScreenReader])

  const handleKeySizeChange = useCallback((size: KeySize) => {
    setKeySize(size)
    announceToScreenReader(`Key size changed to ${size} bits`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "g":
            e.preventDefault()
            if (!generating) generate()
            break
          case "p":
            if (keys) {
              e.preventDefault()
              copy(keys.publicKey, "pub")
            }
            break
          case "l":
            if (keys) {
              e.preventDefault()
              copy(keys.privateKey, "priv")
            }
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [generating, keys, generate, copy])

  const placeholder = (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Key className="h-12 w-12 opacity-15" />
      <p className="text-sm text-center">
        {generating ? "Generating… this may take a few seconds for 4096-bit keys." : "Click Generate Keys to create a new RSA key pair"}
      </p>
    </div>
  )

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">RSA Key Generator</span>
          <div className="flex items-center gap-1" role="group" aria-label="Key size selection">
            {([2048, 4096] as KeySize[]).map(size => (
              <button
                key={size}
                onClick={() => handleKeySizeChange(size)}
                role="radio"
                aria-checked={keySize === size}
                aria-label={`${size}-bit key size`}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${keySize === size ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {size}-bit
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="RSA Key Generator" shortcuts={shortcuts} />
            <Button
              size="sm"
              onClick={generate}
              disabled={generating}
              aria-label={generating ? "Generating key pair, please wait" : "Generate new RSA key pair"}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating..." : "Generate Keys"}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+G</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">RSA Key Generator</h2>
            <ShortcutsModal pageName="RSA Key Generator" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Public Key
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Private Key
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left — Public Key */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Public key">
              <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Public Key</span>
                  <Badge variant="secondary" className="text-xs" aria-label="Safe to share">Safe to share</Badge>
                </div>
                {keys && (
                  <div className="flex gap-1" role="group" aria-label="Public key actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(keys.publicKey, "pub")}
                      aria-label={copied === "pub" ? "Public key copied to clipboard" : "Copy public key"}
                      className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {copied === "pub" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      <span>{copied === "pub" ? "Copied!" : "Copy"}</span>
                      <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+P</kbd>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => download(keys.publicKey, "public.pem")}
                      aria-label="Download public key as public.pem"
                      className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      <span>public.pem</span>
                    </Button>
                  </div>
                )}
              </div>
              {keys
                ? <pre
                    className="flex-1 overflow-auto p-4 text-xs font-mono bg-muted/10 whitespace-pre-wrap break-all leading-relaxed"
                    aria-label="Public key content"
                    tabIndex={0}
                  >{keys.publicKey}</pre>
                : <div role="status" aria-live="polite">{placeholder}</div>
              }
            </div>

          {/* Right — Private Key */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Private key">
              <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Private Key</span>
                  <Badge variant="destructive" className="text-xs" aria-label="Keep secret">Keep secret</Badge>
                </div>
                {keys && (
                  <div className="flex gap-1" role="group" aria-label="Private key actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(keys.privateKey, "priv")}
                      aria-label={copied === "priv" ? "Private key copied to clipboard" : "Copy private key"}
                      className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {copied === "priv" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      <span>{copied === "priv" ? "Copied!" : "Copy"}</span>
                      <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => download(keys.privateKey, "private.pem")}
                      aria-label="Download private key as private.pem"
                      className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      <span>private.pem</span>
                    </Button>
                  </div>
                )}
              </div>
              {keys
                ? <pre
                    className="flex-1 overflow-auto p-4 text-xs font-mono bg-muted/10 whitespace-pre-wrap break-all leading-relaxed"
                    aria-label="Private key content - keep secret"
                    tabIndex={0}
                  >{keys.privateKey}</pre>
                : <div role="status" aria-live="polite">{placeholder}</div>
              }
          </div>
        </div>

        {/* MOBILE: bottom action bar */}
        <div
          className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-1 mr-auto" role="group" aria-label="Key size selection">
            {([2048, 4096] as KeySize[]).map(size => (
              <button
                key={size}
                onClick={() => handleKeySizeChange(size)}
                role="radio"
                aria-checked={keySize === size}
                aria-label={`${size}-bit key size`}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${keySize === size ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {size}-bit
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={generate}
            disabled={generating}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>

      </div>
    </>
  )
}
