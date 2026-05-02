"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Hash, Copy, Check, Upload, FileCheck, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Pure-JS MD5 (RFC 1321) — runs entirely in browser, no server
function md5(buf: ArrayBuffer): string {
  const data = new Uint8Array(buf)
  const len = data.length

  function add(a: number, b: number) {
    const l = (a & 0xffff) + (b & 0xffff)
    return (((a >> 16) + (b >> 16) + (l >> 16)) << 16) | (l & 0xffff)
  }
  function rol(n: number, s: number) { return (n << s) | (n >>> (32 - s)) }
  function step(
    fn: (b: number, c: number, d: number) => number,
    a: number, b: number, c: number, d: number,
    x: number, s: number, t: number
  ) { return add(rol(add(add(a, fn(b, c, d)), add(x, t)), s), b) }

  const F = (b: number, c: number, d: number) => (b & c) | (~b & d)
  const G = (b: number, c: number, d: number) => (b & d) | (c & ~d)
  const H = (b: number, c: number, d: number) => b ^ c ^ d
  const I = (b: number, c: number, d: number) => c ^ (b | ~d)

  const nBlk = Math.ceil((len + 9) / 64)
  const words = new Int32Array(nBlk * 16)
  for (let i = 0; i < len; i++) words[i >> 2] |= data[i] << ((i & 3) * 8)
  words[len >> 2] |= 0x80 << ((len & 3) * 8)
  words[nBlk * 16 - 2] = len << 3
  words[nBlk * 16 - 1] = len >>> 29

  let [a, b, c, d] = [1732584193, -271733879, -1732584194, 271733878]

  for (let i = 0; i < words.length; i += 16) {
    const [sa, sb, sc, sd] = [a, b, c, d]
    const w = (j: number) => words[i + j]

    // Round 1
    a=step(F,a,b,c,d,w(0),7,-680876936);   d=step(F,d,a,b,c,w(1),12,-389564586)
    c=step(F,c,d,a,b,w(2),17,606105819);   b=step(F,b,c,d,a,w(3),22,-1044525330)
    a=step(F,a,b,c,d,w(4),7,-176418897);   d=step(F,d,a,b,c,w(5),12,1200080426)
    c=step(F,c,d,a,b,w(6),17,-1473231341); b=step(F,b,c,d,a,w(7),22,-45705983)
    a=step(F,a,b,c,d,w(8),7,1770035416);   d=step(F,d,a,b,c,w(9),12,-1958414417)
    c=step(F,c,d,a,b,w(10),17,-42063);     b=step(F,b,c,d,a,w(11),22,-1990404162)
    a=step(F,a,b,c,d,w(12),7,1804603682);  d=step(F,d,a,b,c,w(13),12,-40341101)
    c=step(F,c,d,a,b,w(14),17,-1502002290);b=step(F,b,c,d,a,w(15),22,1236535329)

    // Round 2
    a=step(G,a,b,c,d,w(1),5,-165796510);   d=step(G,d,a,b,c,w(6),9,-1069501632)
    c=step(G,c,d,a,b,w(11),14,643717713);  b=step(G,b,c,d,a,w(0),20,-373897302)
    a=step(G,a,b,c,d,w(5),5,-701558691);   d=step(G,d,a,b,c,w(10),9,38016083)
    c=step(G,c,d,a,b,w(15),14,-660478335); b=step(G,b,c,d,a,w(4),20,-405537848)
    a=step(G,a,b,c,d,w(9),5,568446438);    d=step(G,d,a,b,c,w(14),9,-1019803690)
    c=step(G,c,d,a,b,w(3),14,-187363961);  b=step(G,b,c,d,a,w(8),20,1163531501)
    a=step(G,a,b,c,d,w(13),5,-1444681467); d=step(G,d,a,b,c,w(2),9,-51403784)
    c=step(G,c,d,a,b,w(7),14,1735328473);  b=step(G,b,c,d,a,w(12),20,-1926607734)

    // Round 3
    a=step(H,a,b,c,d,w(5),4,-378558);      d=step(H,d,a,b,c,w(8),11,-2022574463)
    c=step(H,c,d,a,b,w(11),16,1839030562); b=step(H,b,c,d,a,w(14),23,-35309556)
    a=step(H,a,b,c,d,w(1),4,-1530992060);  d=step(H,d,a,b,c,w(4),11,1272893353)
    c=step(H,c,d,a,b,w(7),16,-155497632);  b=step(H,b,c,d,a,w(10),23,-1094730640)
    a=step(H,a,b,c,d,w(13),4,681279174);   d=step(H,d,a,b,c,w(0),11,-358537222)
    c=step(H,c,d,a,b,w(3),16,-722521979);  b=step(H,b,c,d,a,w(6),23,76029189)
    a=step(H,a,b,c,d,w(9),4,-640364487);   d=step(H,d,a,b,c,w(12),11,-421815835)
    c=step(H,c,d,a,b,w(15),16,530742520);  b=step(H,b,c,d,a,w(2),23,-995338651)

    // Round 4
    a=step(I,a,b,c,d,w(0),6,-198630844);   d=step(I,d,a,b,c,w(7),10,1126891415)
    c=step(I,c,d,a,b,w(14),15,-1416354905);b=step(I,b,c,d,a,w(5),21,-57434055)
    a=step(I,a,b,c,d,w(12),6,1700485571);  d=step(I,d,a,b,c,w(3),10,-1894986606)
    c=step(I,c,d,a,b,w(10),15,-1051523);   b=step(I,b,c,d,a,w(1),21,-2054922799)
    a=step(I,a,b,c,d,w(8),6,1873313359);   d=step(I,d,a,b,c,w(15),10,-30611744)
    c=step(I,c,d,a,b,w(6),15,-1560198380); b=step(I,b,c,d,a,w(13),21,1309151649)
    a=step(I,a,b,c,d,w(4),6,-145523070);   d=step(I,d,a,b,c,w(11),10,-1120210379)
    c=step(I,c,d,a,b,w(2),15,718787259);   b=step(I,b,c,d,a,w(9),21,-343485551)

    a=add(a,sa); b=add(b,sb); c=add(c,sc); d=add(d,sd)
  }

  const hex = (n: number) => {
    let s = ""
    for (let j = 0; j < 4; j++) s += ((n >>> (j * 8)) & 0xff).toString(16).padStart(2, "0")
    return s
  }
  return hex(a) + hex(b) + hex(c) + hex(d)
}

async function sha(algo: "SHA-1" | "SHA-256" | "SHA-512", buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest(algo, buf)
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("")
}

type Algo = "MD5" | "SHA-1" | "SHA-256" | "SHA-512"
const ALGOS: Algo[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"]

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}

export function FileChecksumVerifier() {
  const [file, setFile] = useState<File | null>(null)
  const [selectedAlgos, setSelectedAlgos] = useState<Set<Algo>>(new Set<Algo>(["SHA-256"]))
  const [expectedHash, setExpectedHash] = useState("")
  const [results, setResults] = useState<{ algo: Algo; hash: string }[]>([])
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedAlgo, setCopiedAlgo] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setResults([])
    setError(null)
  }

  const toggleAlgo = (algo: Algo) => {
    setSelectedAlgos(prev => {
      const next = new Set(prev)
      if (next.has(algo)) {
        if (next.size === 1) return prev
        next.delete(algo)
      } else {
        next.add(algo)
      }
      return next
    })
  }

  const compute = useCallback(async () => {
    if (!file) return
    setComputing(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const hashes: { algo: Algo; hash: string }[] = []
      for (const algo of ALGOS) {
        if (!selectedAlgos.has(algo)) continue
        hashes.push({
          algo,
          hash: algo === "MD5" ? md5(buffer) : await sha(algo, buffer),
        })
      }
      setResults(hashes)
    } catch {
      setError("Failed to read file. Try a smaller file or refresh the page.")
    } finally {
      setComputing(false)
    }
  }, [file, selectedAlgos])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        compute()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault()
        inputRef.current?.click()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [compute])

  const copy = (algo: string, hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedAlgo(algo)
    setTimeout(() => setCopiedAlgo(null), 2000)
  }

  const normalized = expectedHash.trim().toLowerCase()
  const hasExpected = normalized.length > 0
  const matchAlgo = results.find(r => r.hash === normalized)?.algo ?? null

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel — options */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Hash className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">File Checksum Verifier</h1>
              <p className="text-xs text-muted-foreground">Verify file integrity · 100% in-browser</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">File</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => inputRef.current?.click()}
              className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              {file ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResults([]); setError(null) }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <div className="rounded-full bg-muted p-3">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Drop any file here</p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+O</kbd>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Algorithms</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALGOS.map(algo => (
                <button
                  key={algo}
                  onClick={() => toggleAlgo(algo)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors text-left ${
                    selectedAlgos.has(algo)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {algo}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">SHA-256 is recommended for modern file verification</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Expected Hash{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              placeholder="Paste checksum from download page…"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Paste the hash from the software publisher to verify the file has not been tampered with
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4 space-y-2">
          <Button className="w-full" onClick={compute} disabled={!file || computing}>
            {computing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                Computing…
              </>
            ) : (
              <>
                <Hash className="mr-2 h-4 w-4" />
                Compute Hash{selectedAlgos.size > 1 ? "es" : ""}
              </>
            )}
          </Button>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — results */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Hash className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No results yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drop a file and click Compute, or press{" "}
                  <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {hasExpected && (
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                  matchAlgo
                    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {matchAlgo ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" />
                      <span><span className="font-semibold">Match!</span> File verified via {matchAlgo}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span><span className="font-semibold">No match</span> — hash does not match any algorithm</span>
                    </>
                  )}
                </div>
              )}

              {results.map(({ algo, hash }) => {
                const isMatch = hasExpected && hash === normalized
                const isMismatch = hasExpected && !isMatch
                return (
                  <div
                    key={algo}
                    className={`rounded-lg border p-3 space-y-2 transition-opacity ${
                      isMatch
                        ? "border-green-500/40 bg-green-500/5"
                        : isMismatch
                        ? "border-border opacity-50"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground tracking-wide">{algo}</span>
                      {isMatch && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-1 break-all font-mono text-xs leading-relaxed select-all">{hash}</span>
                      <button
                        onClick={() => copy(algo, hash)}
                        className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground mt-0.5"
                      >
                        {copiedAlgo === algo
                          ? <Check className="h-3.5 w-3.5 text-green-500" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ShortcutsModal
        pageName="File Checksum Verifier"
        shortcuts={[
          { keys: ["Ctrl", "Enter"], description: "Compute hash" },
          { keys: ["Ctrl", "O"], description: "Open file picker" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
