"use client"

import { useState } from "react"
import { Copy, Check, Lock, Unlock, Eye, EyeOff, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "encrypt" | "decrypt"

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

async function encryptText(text: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text)
  )
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, 16)
  combined.set(new Uint8Array(ciphertext), 28)
  return btoa(String.fromCharCode(...combined))
}

async function decryptText(b64: string, passphrase: string): Promise<string> {
  const combined = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0))
  const key = await deriveKey(passphrase, combined.slice(0, 16))
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(16, 28) },
    key,
    combined.slice(28)
  )
  return new TextDecoder().decode(plaintext)
}

export default function AesEncryptor() {
  const [mode, setMode] = useState<Mode>("encrypt")
  const [input, setInput] = useState("")
  const [passphrase, setPassphrase] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setInput("")
    setOutput("")
    setError("")
  }

  const swap = () => {
    const newMode: Mode = mode === "encrypt" ? "decrypt" : "encrypt"
    setMode(newMode)
    setInput(output)
    setOutput("")
    setError("")
  }

  const run = async () => {
    if (!input.trim() || !passphrase.trim()) return
    setLoading(true)
    setError("")
    setOutput("")
    try {
      setOutput(mode === "encrypt"
        ? await encryptText(input, passphrase)
        : await decryptText(input, passphrase)
      )
    } catch {
      setError(mode === "decrypt"
        ? "Decryption failed — wrong passphrase or corrupted data"
        : "Encryption failed"
      )
    }
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">AES Encrypt / Decrypt</h1>
            <p className="text-sm text-muted-foreground">AES-256-GCM with PBKDF2 key derivation. Nothing leaves your browser.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={mode === "encrypt" ? "default" : "outline"} size="sm" onClick={() => switchMode("encrypt")}>
              <Lock className="h-4 w-4 mr-1" />Encrypt
            </Button>
            <Button variant={mode === "decrypt" ? "default" : "outline"} size="sm" onClick={() => switchMode("decrypt")}>
              <Unlock className="h-4 w-4 mr-1" />Decrypt
            </Button>
            <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
              <ArrowLeftRight className="h-4 w-4 mr-1" />Swap
            </Button>
          </div>
        </div>
      </div>

      {/* Passphrase bar */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-3 max-w-2xl">
          <Label className="text-sm font-medium shrink-0">Passphrase</Label>
          <div className="flex-1 relative">
            <Input
              type={showPass ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Enter a strong passphrase..."
              className="font-mono pr-10"
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPass(p => !p)}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button onClick={run} disabled={!input.trim() || !passphrase.trim() || loading}>
            {loading ? "Working..." : mode === "encrypt" ? "Encrypt" : "Decrypt"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Input */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "encrypt" ? "Plaintext" : "Encrypted Text (Base64)"}</h3>
          </div>
          <Textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setOutput(""); setError("") }}
            placeholder={mode === "encrypt" ? "Enter the text to encrypt..." : "Paste the encrypted base64 string..."}
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono"
          />
        </div>

        {/* Right — Output */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{mode === "encrypt" ? "Encrypted Output (Base64)" : "Decrypted Text"}</h3>
            <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          {error ? (
            <div className="flex-1 p-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder={`Output will appear here after clicking ${mode === "encrypt" ? "Encrypt" : "Decrypt"}...`}
              className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10"
            />
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground flex gap-4">
        <span>AES-256-GCM</span>
        <span>PBKDF2-SHA256 · 100k iterations</span>
        <span>Random salt + IV per encryption</span>
        <span>Nothing leaves your browser</span>
      </div>
    </div>
  )
}
