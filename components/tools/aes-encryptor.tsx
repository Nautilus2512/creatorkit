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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
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
    
    // Ctrl+Shift+E — switch to Encrypt mode
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
      e.preventDefault()
      e.stopPropagation()
      setMode("encrypt")
      setInput("")
      setOutput("")
      setError("")
      announceToScreenReader("Switched to encrypt mode")
      return
    }

    // Ctrl+Shift+L — switch to Decrypt mode
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
      e.preventDefault()
      e.stopPropagation()
      setMode("decrypt")
      setInput("")
      setOutput("")
      setError("")
      announceToScreenReader("Switched to decrypt mode")
      return
    }

    // Ctrl+Shift+X — swap input/output
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault()
      e.stopPropagation()
      swap()
      return
    }

    // Ctrl+Shift+V — copy output (Ctrl+Shift+C conflicts with DevTools Inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
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
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar (full toolbar) */}
      <div className="hidden md:flex shrink-0 items-center flex-wrap gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="AES encryption controls">
        <span className="text-sm font-semibold shrink-0 mr-1">AES Encrypt / Decrypt</span>
        <Button variant={mode === "encrypt" ? "default" : "outline"} size="sm" onClick={() => switchMode("encrypt")} aria-pressed={mode === "encrypt"} aria-label="Encrypt mode">
          <Lock className="h-4 w-4 mr-1" aria-hidden="true" />Encrypt
          <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${mode === "encrypt" ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+E</kbd>
        </Button>
        <Button variant={mode === "decrypt" ? "default" : "outline"} size="sm" onClick={() => switchMode("decrypt")} aria-pressed={mode === "decrypt"} aria-label="Decrypt mode">
          <Unlock className="h-4 w-4 mr-1" aria-hidden="true" />Decrypt
          <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${mode === "decrypt" ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+L</kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={swap} disabled={!output} aria-label="Swap input and output">
          <ArrowLeftRight className="h-4 w-4 mr-1" aria-hidden="true" />Swap
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Label htmlFor="passphrase-d" className="text-sm font-medium shrink-0">Passphrase</Label>
          <div className="relative flex-1">
            <Input id="passphrase-d" type={showPass ? "text" : "password"} value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run() } }}
              placeholder="Enter a strong passphrase…" className="font-mono pr-10 h-8 text-sm" aria-label="Passphrase" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded p-0.5"
              onClick={() => { setShowPass(p => !p); announceToScreenReader(showPass ? "Passphrase hidden" : "Passphrase visible") }}
              aria-label={showPass ? "Hide passphrase" : "Show passphrase"} aria-pressed={showPass}>
              {showPass ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="AES Encrypt / Decrypt" shortcuts={[
            { keys: ["Ctrl", "Shift", "E"], description: "Switch to Encrypt mode" },
            { keys: ["Ctrl", "Shift", "L"], description: "Switch to Decrypt mode" },
            { keys: ["Ctrl", "Enter"], description: "Run Encrypt / Decrypt" },
            { keys: ["Ctrl", "Shift", "X"], description: "Swap input/output" },
            { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
          ]} />
          <Button size="sm" onClick={run} disabled={!input.trim() || !passphrase.trim() || loading} aria-label={mode === "encrypt" ? "Encrypt text" : "Decrypt text"}>
            {loading ? <><span className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Working…</>
              : <>{mode === "encrypt" ? "Encrypt" : "Decrypt"}<kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Enter</kbd></>}
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + passphrase + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">AES Encrypt / Decrypt</h2>
          <div className="flex items-center gap-1.5">
            <Button variant={mode === "encrypt" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => switchMode("encrypt")} aria-pressed={mode === "encrypt"}>Enc</Button>
            <Button variant={mode === "decrypt" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => switchMode("decrypt")} aria-pressed={mode === "decrypt"}>Dec</Button>
            <ShortcutsModal pageName="AES Encrypt / Decrypt" shortcuts={[
              { keys: ["Ctrl", "Shift", "E"], description: "Switch to Encrypt mode" },
              { keys: ["Ctrl", "Shift", "L"], description: "Switch to Decrypt mode" },
              { keys: ["Ctrl", "Enter"], description: "Run Encrypt / Decrypt" },
              { keys: ["Ctrl", "Shift", "X"], description: "Swap input/output" },
              { keys: ["Ctrl", "Shift", "V"], description: "Copy output" },
            ]} />
          </div>
        </div>
        <div className="px-4 pb-2 flex items-center gap-2">
          <Label htmlFor="passphrase-m" className="text-xs font-medium shrink-0 text-muted-foreground">Pass</Label>
          <div className="relative flex-1">
            <Input id="passphrase-m" type={showPass ? "text" : "password"} value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)} placeholder="Passphrase…"
              className="font-mono pr-8 h-8 text-sm" aria-label="Passphrase" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(p => !p)} aria-label={showPass ? "Hide" : "Show"}>
              {showPass ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            {mode === "encrypt" ? "Plaintext" : "Encrypted"}
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Output
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">
          {/* Left — Input */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Input text">
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
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Output result">
            <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium" id="output-label">{mode === "encrypt" ? "Encrypted Output (Base64)" : "Decrypted Text"}</span>
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output} aria-label="Copy output to clipboard">
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
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

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">How to use AES Encrypt / Decrypt</h3>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Encrypting a message</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Make sure <span className="text-foreground font-medium">Encrypt</span> mode is selected in the toolbar.</li>
              <li>Type or paste your message into the <span className="text-foreground font-medium">Plaintext</span> panel on the left.</li>
              <li>Enter a <span className="text-foreground font-medium">Passphrase</span>. This is the secret key used to lock the message. Keep it safe, because without it the message cannot be decrypted.</li>
              <li>Click <span className="text-foreground font-medium">Encrypt</span> (or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd>). The encrypted text appears on the right as a Base64 string.</li>
              <li>Copy the output and share it. The encrypted string is safe to send over any channel.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Decrypting a message</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Switch to <span className="text-foreground font-medium">Decrypt</span> mode, or use the <span className="text-foreground font-medium">Swap</span> button if the encrypted output is already shown.</li>
              <li>Paste the encrypted Base64 string into the input panel.</li>
              <li>Enter the <span className="text-foreground font-medium">same passphrase</span> used during encryption.</li>
              <li>Click <span className="text-foreground font-medium">Decrypt</span>. The original message will appear in the output panel.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How the encryption works</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This tool uses <span className="text-foreground font-medium">AES-256-GCM</span>, the same standard used by banks and governments. Your passphrase is never used directly as a key. Instead, it goes through <span className="text-foreground font-medium">PBKDF2-SHA256</span> with 100,000 iterations to derive a strong 256-bit key. A unique random salt and IV are generated for every single encryption, so the same plaintext and passphrase will produce a different ciphertext each time. Everything runs in your browser and nothing is ever sent to a server.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Passphrase tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Use a long passphrase. A random sentence of 4–6 words is far stronger than a short complex password.</li>
              <li>Never share your passphrase over the same channel as the encrypted message.</li>
              <li>There is no passphrase recovery. If you forget it, the message cannot be decrypted.</li>
              <li>The output Base64 string contains the encrypted data, salt, and IV. It is safe to store or transmit publicly.</li>
            </ul>
          </div>
        </div>

        {/* Spacer so content doesn't hide behind the fixed mobile bar */}
        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* Mobile: bottom action bar — fixed to viewport bottom */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button variant="ghost" size="sm" className="h-11 px-2" onClick={swap} disabled={!output} aria-label="Swap">
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={() => { run(); setActiveTab("output") }} disabled={!input.trim() || !passphrase.trim() || loading} aria-label={mode === "encrypt" ? "Encrypt" : "Decrypt"}>
          {loading ? "Working…" : mode === "encrypt" ? <><Lock className="h-4 w-4 mr-1.5" aria-hidden="true" />Encrypt</> : <><Unlock className="h-4 w-4 mr-1.5" aria-hidden="true" />Decrypt</>}
        </Button>
      </div>

    </div>
    </>
  )
}
