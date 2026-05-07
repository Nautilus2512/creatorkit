"use client"

import { useState } from "react"
import { Copy, Check, Download, RefreshCw, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

export default function RsaKeyGenerator() {
  const [keySize, setKeySize] = useState<KeySize>(2048)
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const generate = async () => {
    setGenerating(true)
    setKeys(null)
    try {
      setKeys(await generatePair(keySize))
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const empty = (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
      <Key className="h-12 w-12 opacity-15" />
      <p className="text-sm text-center">
        {generating ? "Generating… this may take a few seconds for 4096-bit keys." : "Click Generate Keys to create a new RSA key pair"}
      </p>
    </div>
  )

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">RSA Key Generator</h1>
            <p className="text-sm text-muted-foreground">Generate RSA-OAEP key pairs in PEM format. Nothing leaves your browser.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {([2048, 4096] as KeySize[]).map(size => (
                <button
                  key={size}
                  onClick={() => setKeySize(size)}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${keySize === size ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {size}-bit
                </button>
              ))}
            </div>
            <Button onClick={generate} disabled={generating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating..." : "Generate Keys"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Public Key */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Public Key</h3>
              <Badge variant="secondary" className="text-xs">Safe to share</Badge>
            </div>
            {keys && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => copy(keys.publicKey, "pub")}>
                  {copied === "pub" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied === "pub" ? "Copied!" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => download(keys.publicKey, "public.pem")}>
                  <Download className="h-4 w-4 mr-1" />public.pem
                </Button>
              </div>
            )}
          </div>
          {keys
            ? <pre className="flex-1 overflow-auto p-4 text-xs font-mono bg-muted/10 whitespace-pre-wrap break-all leading-relaxed">{keys.publicKey}</pre>
            : empty
          }
        </div>

        {/* Right — Private Key */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Private Key</h3>
              <Badge variant="destructive" className="text-xs">Keep secret</Badge>
            </div>
            {keys && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => copy(keys.privateKey, "priv")}>
                  {copied === "priv" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied === "priv" ? "Copied!" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => download(keys.privateKey, "private.pem")}>
                  <Download className="h-4 w-4 mr-1" />private.pem
                </Button>
              </div>
            )}
          </div>
          {keys
            ? <pre className="flex-1 overflow-auto p-4 text-xs font-mono bg-muted/10 whitespace-pre-wrap break-all leading-relaxed">{keys.privateKey}</pre>
            : empty
          }
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
        <span>RSA-OAEP-SHA256</span>
        <span>PKCS#8 private · SPKI public</span>
        <span>Exponent: 65537</span>
        <span>Nothing leaves your browser</span>
      </div>
    </div>
  )
}
