"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Lock, Unlock, Eye, EyeOff, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Accessibility helper for screen reader announcements
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

type Mode = "encrypt" | "decrypt"

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
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
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>
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
  const combined = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
  const key = await deriveKey(passphrase, combined.slice(0, 16) as Uint8Array<ArrayBuffer>)
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
    announceToScreenReader(`Switched to ${newMode} mode`)
  }

  const swap = () => {
    if (!output) return
    const newMode: Mode = mode === "encrypt" ? "decrypt" : "encrypt"
    setMode(newMode)
    setInput(output)
    setOutput("")
    setError("")
    announceToScreenReader(`Swapped to ${newMode} mode with previous output`)
  }

  const run = useCallback(async () => {
    if (!input.trim() || !passphrase.trim()) {
      announceToScreenReader('Please enter both text and passphrase')
      return
    }
    setLoading(true)
    setError("")
    setOutput("")
    announceToScreenReader(`${mode === "encrypt" ? "Encrypting" : "Decrypting"}...`)
    try {
      const result = mode === "encrypt"
        ? await encryptText(input, passphrase)
        : await decryptText(input, passphrase)
      setOutput(result)
      announceToScreenReader(`${mode === "encrypt" ? "Encryption" : "Decryption"} complete. Output ready.`)
    } catch {
      const errorMsg = mode === "decrypt"
        ? "Decryption failed — wrong passphrase or corrupted data"
        : "Encryption failed"
      setError(errorMsg)
      announceToScreenReader(`Error: ${errorMsg}`)
    }
    setLoading(false)
  }, [input, passphrase, mode])

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    announceToScreenReader('Output copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  // Keyboard shortcuts - defined outside useEffect to ensure they're always fresh
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in textareas/inputs (except for Ctrl+Enter)
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) return
    }
    
    // Ctrl+Enter to run encrypt/decrypt
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      run()
      return
    }
    
    // Ctrl+Shift+X to swap (changed from S to avoid Windows screenshot collision)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault()
      e.stopPropagation()
      swap()
      return
    }
    
    // Ctrl+Shift+C to copy output
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault()
      e.stopPropagation()
      if (output) {
        copy()
      }
      return
    }
    
    // Escape to clear error
    if (e.key === "Escape" && error) {
      e.preventDefault()
      setError("")
      return
    }
  }, [run, swap, copy, output, error])

  // Register keyboard shortcuts
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [handleKeyDown])

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div role="banner">
        <h2 className="text-2xl font-semibold tracking-tight" id="aes-title">AES Encrypt / Decrypt</h2>
        <p className="text-muted-foreground" id="aes-description">AES-256-GCM with PBKDF2 key derivation. Nothing leaves your browser. Press ? for keyboard shortcuts.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Encryption controls">
        <Button 
          variant={mode === "encrypt" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("encrypt")}
          aria-pressed={mode === "encrypt"}
          aria-label="Switch to encrypt mode"
        >
          <Lock className="h-4 w-4 mr-1" aria-hidden="true" />Encrypt
        </Button>
        <Button 
          variant={mode === "decrypt" ? "default" : "outline"} 
          size="sm" 
          onClick={() => switchMode("decrypt")}
          aria-pressed={mode === "decrypt"}
          aria-label="Switch to decrypt mode"
        >
          <Unlock className="h-4 w-4 mr-1" aria-hidden="true" />Decrypt
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={swap} 
          disabled={!output}
          aria-label="Swap input and output"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
        </Button>
        <div className="flex items-center gap-2 ml-2 flex-1 min-w-0">
          <Label htmlFor="passphrase" className="text-sm font-medium shrink-0">Passphrase</Label>
          <div className="relative flex-1 max-w-sm">
            <Input
              id="passphrase"
              type={showPass ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  run()
                }
              }}
              placeholder="Enter a strong passphrase..."
              className="font-mono pr-10"
              aria-label="Passphrase input"
              aria-describedby="passphrase-help"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded p-0.5"
              onClick={() => {
                setShowPass(p => !p)
                announceToScreenReader(showPass ? 'Passphrase hidden' : 'Passphrase visible')
              }}
              aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
              aria-pressed={showPass}
              tabIndex={0}
            >
              {showPass ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <span id="passphrase-help" className="sr-only">Press Ctrl+Enter to run encryption or decryption</span>
          <Button 
            onClick={run} 
            disabled={!input.trim() || !passphrase.trim() || loading} 
            size="sm"
            aria-label={mode === "encrypt" ? "Encrypt text" : "Decrypt text"}
          >
            {loading ? (
              <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Working...</>
            ) : (
              <>{mode === "encrypt" ? "Encrypt" : "Decrypt"}<kbd className="ml-1.5 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Enter</kbd></>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Input text">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="input-label">{mode === "encrypt" ? "Plaintext" : "Encrypted Text (Base64)"}</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setOutput(""); setError("") }}
            placeholder={mode === "encrypt" ? "Enter the text to encrypt..." : "Paste the encrypted base64 string..."}
            className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono p-4"
            aria-labelledby="input-label"
            aria-describedby="input-hint"
          />
          <span id="input-hint" className="sr-only">{mode === "encrypt" ? "Enter text to encrypt" : "Paste base64 encrypted text to decrypt"}</span>
        </div>

        {/* Right — Output */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Output result">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" id="output-label">{mode === "encrypt" ? "Encrypted Output (Base64)" : "Decrypted Text"}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copy} 
              disabled={!output}
              aria-label="Copy output to clipboard"
            >
              {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}<kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
          </div>
          {error ? (
            <div className="flex-1 p-4" role="alert" aria-live="assertive">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder={`Output will appear here after clicking ${mode === "encrypt" ? "Encrypt" : "Decrypt"}...`}
              className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 font-mono bg-muted/10 p-4"
              aria-labelledby="output-label"
              aria-live="polite"
            />
          )}
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-3 flex-wrap" role="contentinfo">
            <span>AES-256-GCM</span>
            <span>PBKDF2-SHA256 · 100k iterations</span>
            <span>Random salt + IV per encryption</span>
          </div>
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="AES Encrypt / Decrypt"
      shortcuts={[
        { keys: ["Ctrl", "Enter"], description: "Run Encrypt / Decrypt" },
        { keys: ["Ctrl", "Shift", "X"], description: "Swap input/output" },
        { keys: ["Ctrl", "Shift", "C"], description: "Copy output to clipboard" },
        { keys: ["Escape"], description: "Clear error message" },
        { keys: ["?"], description: "Toggle this shortcuts panel" },
        { keys: ["Tab"], description: "Navigate between controls" },
        { keys: ["Enter"], description: "Activate focused button" },
      ]}
    />
    </>
  )
}
