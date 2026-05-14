"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

// ── helpers ───────────────────────────────────────────────────────────────────

function n(s: string): number | null {
  const v = parseFloat(s)
  return isNaN(v) || s.trim() === "" ? null : v
}

function fmt(v: number | null, unit = "", decimals = 4): string {
  if (v === null || !isFinite(v)) return "—"
  const abs = Math.abs(v)
  if (abs === 0) return `0 ${unit}`.trim()
  if (abs >= 1e6)  return `${(v / 1e6).toPrecision(4)} M${unit}`
  if (abs >= 1e3)  return `${(v / 1e3).toPrecision(4)} k${unit}`
  if (abs < 1e-6)  return `${(v * 1e9).toPrecision(4)} n${unit}`
  if (abs < 1e-3)  return `${(v * 1e6).toPrecision(4)} µ${unit}`
  if (abs < 1)     return `${(v * 1e3).toPrecision(4)} m${unit}`
  return `${parseFloat(v.toPrecision(decimals))} ${unit}`.trim()
}

function ResultRow({ label, value, unit, highlight = false, id }: { label: string; value: number | null; unit?: string; highlight?: boolean; id?: string }) {
  return (
    <div
      id={id}
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-border"}`}
      role="status"
      aria-live="polite"
      aria-label={`${label}: ${fmt(value, unit)}`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{fmt(value, unit)}</span>
    </div>
  )
}

function FieldRow({ label, value, unit, onChange, placeholder = "0", id, shortcut }: { label: string; value: string; unit: string; onChange: (v: string) => void; placeholder?: string; id?: string; shortcut?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-sm text-muted-foreground w-24 shrink-0">{label}</Label>
      <div className="flex-1 relative">
        <Input
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm font-mono h-8 pr-16"
          type="number"
          aria-label={`${label} in ${unit}`}
        />
        {shortcut && (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground pointer-events-none" aria-hidden="true">
            {shortcut}
          </kbd>
        )}
      </div>
      <span className="text-sm text-muted-foreground w-12 shrink-0" aria-hidden="true">{unit}</span>
    </div>
  )
}

// ── Ohm's Law tab ─────────────────────────────────────────────────────────────
function OhmsLaw() {
  const [V, setV] = useState(""); const [I, setI] = useState(""); const [R, setR] = useState(""); const [P, setP] = useState("")
  const v = n(V), i = n(I), r = n(R), p = n(P)
  const filled = [v, i, r, p].filter(x => x !== null).length

  let cV = v, cI = i, cR = r, cP = p
  if (filled >= 2) {
    if (v !== null && i !== null) { cR = v / i; cP = v * i }
    else if (v !== null && r !== null) { cI = v / r; cP = v * v / r }
    else if (v !== null && p !== null) { cI = p / v; cR = v * v / p }
    else if (i !== null && r !== null) { cV = i * r; cP = i * i * r }
    else if (i !== null && p !== null) { cV = p / i; cR = p / (i * i) }
    else if (r !== null && p !== null) { cV = Math.sqrt(p * r); cI = Math.sqrt(p / r) }
  }

  return (
    <div className="space-y-4" role="region" aria-label="Ohm's Law calculator">
      <p className="text-xs text-muted-foreground">Enter any <strong>2 values</strong> — the others are calculated automatically.</p>
      <div className="space-y-2">
        <FieldRow id="ohms-voltage" label="Voltage (V)" value={V} unit="V" onChange={setV} shortcut="V" />
        <FieldRow id="ohms-current" label="Current (I)" value={I} unit="A" onChange={setI} shortcut="I" />
        <FieldRow id="ohms-resistance" label="Resistance (R)" value={R} unit="Ω" onChange={setR} shortcut="R" />
        <FieldRow id="ohms-power" label="Power (P)" value={P} unit="W" onChange={setP} shortcut="P" />
      </div>
      {filled >= 2 && (
        <div className="space-y-2" role="region" aria-label="Calculated results">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
          <ResultRow label="Voltage"     value={cV} unit="V" highlight={v === null} />
          <ResultRow label="Current"     value={cI} unit="A" highlight={i === null} />
          <ResultRow label="Resistance"  value={cR} unit="Ω" highlight={r === null} />
          <ResultRow label="Power"       value={cP} unit="W" highlight={p === null} />
        </div>
      )}
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-0.5" role="note">
        <p>V = IR &nbsp;·&nbsp; P = VI = I²R = V²/R</p>
        <p className="opacity-60">IEC 60027 / IEEE Std 260 — SI units</p>
      </div>
    </div>
  )
}

// ── AC Reactance tab ──────────────────────────────────────────────────────────
function AcReactance() {
  const [freq, setFreq] = useState("50"); const [L, setL] = useState(""); const [C, setC] = useState(""); const [R, setR] = useState("")
  const f = n(freq), l = n(L), c = n(C), r = n(R)
  const XL   = f !== null && l !== null ? 2 * Math.PI * f * l : null
  const XC   = f !== null && c !== null && c !== 0 ? 1 / (2 * Math.PI * f * c) : null
  const Xnet = XL !== null || XC !== null ? (XL ?? 0) - (XC ?? 0) : null
  const Z    = r !== null && Xnet !== null ? Math.sqrt(r * r + Xnet * Xnet) : r !== null ? r : Xnet !== null ? Math.abs(Xnet) : null
  const thetaDeg = r !== null && Xnet !== null && r !== 0 ? Math.atan(Xnet / r) * 180 / Math.PI : null
  const PF = thetaDeg !== null ? Math.cos(thetaDeg * Math.PI / 180) : null

  return (
    <div className="space-y-4" role="region" aria-label="AC Reactance calculator">
      <div className="flex gap-1" role="radiogroup" aria-label="Frequency preset">
        {["50", "60"].map((hz, idx) => (
          <button
            key={hz}
            onClick={() => setFreq(hz)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${freq === hz ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            role="radio"
            aria-checked={freq === hz}
            aria-label={`${hz} Hertz`}
          >
            {hz} Hz<kbd className="ml-1.5 text-[9px] opacity-50" aria-hidden="true">{idx + 1}</kbd>
          </button>
        ))}
        <div className="relative">
          <Input
            value={freq}
            onChange={e => setFreq(e.target.value)}
            placeholder="Hz"
            className="w-24 h-7 text-xs font-mono"
            type="number"
            aria-label="Custom frequency in Hertz"
          />
          <kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1 text-[9px] text-muted-foreground pointer-events-none" aria-hidden="true">F</kbd>
        </div>
      </div>
      <div className="space-y-2">
        <FieldRow id="ac-inductance" label="Inductance (L)" value={L} unit="H"  onChange={setL} placeholder="e.g. 0.01" shortcut="L" />
        <FieldRow id="ac-capacitance" label="Capacitance (C)" value={C} unit="F" onChange={setC} placeholder="e.g. 0.0001" shortcut="C" />
        <FieldRow id="ac-resistance" label="Resistance (R)" value={R} unit="Ω"  onChange={setR} shortcut="R" />
      </div>
      <div className="space-y-2" role="region" aria-label="Calculated results">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
        <ResultRow label="Inductive Reactance XL" value={XL} unit="Ω" />
        <ResultRow label="Capacitive Reactance XC" value={XC} unit="Ω" />
        <ResultRow label="Net Reactance X = XL−XC" value={Xnet} unit="Ω" />
        <ResultRow label="Impedance |Z|" value={Z} unit="Ω" highlight />
        <ResultRow label="Phase Angle θ" value={thetaDeg} unit="°" />
        <ResultRow label="Power Factor" value={PF} />
      </div>
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-0.5" role="note">
        <p>XL = 2πfL &nbsp;·&nbsp; XC = 1/(2πfC) &nbsp;·&nbsp; Z = √(R²+X²)</p>
        <p className="opacity-60">IEC 60038 / IEEE Std 519 — 50 Hz (IEC), 60 Hz (IEEE/ANSI)</p>
      </div>
    </div>
  )
}

// ── Power tab ─────────────────────────────────────────────────────────────────
function PowerCalc() {
  const [V, setV] = useState(""); const [I, setI] = useState(""); const [PF, setPF] = useState("1")
  const v = n(V), i = n(I), pf = n(PF) ?? 1
  const S = v !== null && i !== null ? v * i : null
  const P = S !== null ? S * Math.abs(pf) : null
  const Q = S !== null ? S * Math.sin(Math.acos(Math.min(1, Math.abs(pf)))) : null
  const thetaDeg = Math.acos(Math.min(1, Math.abs(pf))) * 180 / Math.PI

  return (
    <div className="space-y-4" role="region" aria-label="Power calculator">
      <div className="space-y-2">
        <FieldRow id="power-voltage" label="Voltage (V)"    value={V}  unit="V"  onChange={setV} shortcut="V" />
        <FieldRow id="power-current" label="Current (I)"    value={I}  unit="A"  onChange={setI} shortcut="I" />
        <FieldRow id="power-factor" label="Power Factor"   value={PF} unit=""   onChange={setPF} placeholder="0 – 1" shortcut="F" />
      </div>
      <div className="space-y-2" role="region" aria-label="Calculated results">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results (Single-Phase AC)</p>
        <ResultRow label="Apparent Power S" value={S} unit="VA" highlight />
        <ResultRow label="Active Power P"   value={P} unit="W" highlight />
        <ResultRow label="Reactive Power Q" value={Q} unit="VAr" />
        <ResultRow label="Phase Angle θ"    value={isNaN(thetaDeg) ? null : thetaDeg} unit="°" />
      </div>
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-0.5" role="note">
        <p>S = VI &nbsp;·&nbsp; P = S·PF &nbsp;·&nbsp; Q = S·sin(θ) &nbsp;·&nbsp; PF = P/S</p>
        <p className="opacity-60">IEC 60050-131 — Power quality standards</p>
      </div>
    </div>
  )
}

// ── Three-Phase tab ───────────────────────────────────────────────────────────
function ThreePhase() {
  const [cfg, setCfg] = useState<"star"|"delta">("star")
  const [VL, setVL] = useState(""); const [IL, setIL] = useState(""); const [PF, setPF] = useState("0.9")
  const vl = n(VL), il = n(IL), pf = n(PF) ?? 0.9

  const VP = vl !== null ? (cfg === "star" ? vl / Math.sqrt(3) : vl) : null
  const IP = il !== null ? (cfg === "star" ? il : il / Math.sqrt(3)) : null
  const S  = vl !== null && il !== null ? Math.sqrt(3) * vl * il : null
  const P  = S !== null ? S * Math.abs(pf) : null
  const Q  = S !== null ? S * Math.sin(Math.acos(Math.min(1, Math.abs(pf)))) : null

  return (
    <div className="space-y-4" role="region" aria-label="Three-Phase calculator">
      <div className="flex gap-2" role="radiogroup" aria-label="Circuit configuration">
        {(["star", "delta"] as const).map((c, idx) => (
          <button
            key={c}
            onClick={() => setCfg(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${cfg === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            role="radio"
            aria-checked={cfg === c}
            aria-label={c === "star" ? "Star configuration (Y)" : "Delta configuration (Δ)"}
          >
            {c === "star" ? "⭐ Star (Y)" : "△ Delta (Δ)"}<kbd className="ml-2 text-[9px] opacity-50" aria-hidden="true">{idx + 1}</kbd>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <FieldRow id="3phase-voltage" label="Line Voltage VL"  value={VL}  unit="V"  onChange={setVL} shortcut="V" />
        <FieldRow id="3phase-current" label="Line Current IL"  value={IL}  unit="A"  onChange={setIL} shortcut="I" />
        <FieldRow id="3phase-pf" label="Power Factor"     value={PF}  unit=""   onChange={setPF} placeholder="0 – 1" shortcut="F" />
      </div>
      <div className="space-y-2" role="region" aria-label="Calculated results">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
        <ResultRow label="Phase Voltage VP" value={VP} unit="V" />
        <ResultRow label="Phase Current IP" value={IP} unit="A" />
        <ResultRow label="Apparent Power S" value={S}  unit="VA" highlight />
        <ResultRow label="Active Power P"   value={P}  unit="W" highlight />
        <ResultRow label="Reactive Power Q" value={Q}  unit="VAr" />
      </div>
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-0.5" role="note">
        <p>{cfg === "star" ? "Star: VP = VL/√3 · IP = IL" : "Delta: VP = VL · IP = IL/√3"}</p>
        <p>P₃φ = √3·VL·IL·PF &nbsp;·&nbsp; S₃φ = √3·VL·IL</p>
        <p className="opacity-60">IEC 60038 — Standard voltages (230/400 V, 120/208 V)</p>
      </div>
    </div>
  )
}

// ── Resistor Color Code tab ───────────────────────────────────────────────────
const COLORS = [
  { name: "Black",  digit: 0,  mult: 1,       tol: null,   bg: "#1a1a1a", text: "#ffffff" },
  { name: "Brown",  digit: 1,  mult: 10,       tol: "±1%",  bg: "#7b4b2a", text: "#ffffff" },
  { name: "Red",    digit: 2,  mult: 100,      tol: "±2%",  bg: "#cc0000", text: "#ffffff" },
  { name: "Orange", digit: 3,  mult: 1000,     tol: null,   bg: "#ff7f00", text: "#000000" },
  { name: "Yellow", digit: 4,  mult: 10000,    tol: null,   bg: "#ffff00", text: "#000000" },
  { name: "Green",  digit: 5,  mult: 100000,   tol: "±0.5%",bg: "#007700", text: "#ffffff" },
  { name: "Blue",   digit: 6,  mult: 1e6,      tol: "±0.25%",bg:"#0000cc", text: "#ffffff" },
  { name: "Violet", digit: 7,  mult: 1e7,      tol: "±0.1%",bg: "#7b00b4", text: "#ffffff" },
  { name: "Grey",   digit: 8,  mult: 1e8,      tol: "±0.05%",bg:"#808080", text: "#ffffff" },
  { name: "White",  digit: 9,  mult: 1e9,      tol: null,   bg: "#ffffff", text: "#000000" },
  { name: "Gold",   digit: null, mult: 0.1,    tol: "±5%",  bg: "#cfb53b", text: "#000000" },
  { name: "Silver", digit: null, mult: 0.01,   tol: "±10%", bg: "#c0c0c0", text: "#000000" },
]

function ResistorColorCode() {
  const [bands, setBands] = useState(4)
  const [sel, setSel] = useState(["Brown", "Black", "Red", "Gold"])

  const setBand = (i: number, name: string) => setSel(s => s.map((v, j) => j === i ? name : v))
  const getC = (name: string) => COLORS.find(c => c.name === name)

  const digitColors = COLORS.filter(c => c.digit !== null)
  const multColors  = COLORS.filter(c => c.mult !== undefined)
  const tolColors   = COLORS.filter(c => c.tol !== null)

  const c1 = getC(sel[0]), c2 = getC(sel[1]), c3 = bands === 5 ? getC(sel[2]) : null
  const multIdx = bands === 5 ? 3 : 2
  const tolIdx  = bands === 5 ? 4 : 3
  const cM = getC(sel[multIdx]), cT = getC(sel[tolIdx])

  const digits = bands === 5
    ? (c1?.digit ?? 0) * 100 + (c2?.digit ?? 0) * 10 + (c3?.digit ?? 0)
    : (c1?.digit ?? 0) * 10 + (c2?.digit ?? 0)
  const value = cM ? digits * cM.mult : null
  const tolerance = cT?.tol ?? null

  function ColorSelect({ label, options, value, onChange, id, shortcut }: { label: string; options: typeof COLORS; value: string; onChange: (v: string) => void; id?: string; shortcut?: string }) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
          {shortcut && <kbd className="text-[9px] text-muted-foreground/60">{shortcut}</kbd>}
        </div>
        <div id={id} className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
          {options.map((c, idx) => (
            <button
              key={c.name}
              onClick={() => onChange(c.name)}
              title={c.name}
              className={`w-6 h-6 rounded border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary ${value === c.name ? "border-primary scale-125" : "border-transparent hover:scale-110"}`}
              style={{ backgroundColor: c.bg, color: c.text }}
              role="radio"
              aria-checked={value === c.name}
              aria-label={`${c.name}${c.digit !== null ? `, digit ${c.digit}` : ''}${c.mult !== undefined && c.mult !== 1 ? `, multiplier ${c.mult}` : ''}${c.tol ? `, tolerance ${c.tol}` : ''}`}
            >
              <span className="sr-only">{c.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs font-mono text-muted-foreground" aria-live="polite">{value}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="region" aria-label="Resistor color code calculator">
      <div className="flex gap-2" role="radiogroup" aria-label="Number of bands">
        {[4, 5].map((b, idx) => (
          <button
            key={b}
            onClick={() => { setBands(b); setSel(b === 4 ? ["Brown","Black","Red","Gold"] : ["Brown","Black","Black","Red","Gold"]) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${bands === b ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            role="radio"
            aria-checked={bands === b}
            aria-label={`${b} band resistor`}
          >
            {b}-Band<kbd className="ml-2 text-[9px] opacity-50" aria-hidden="true">{idx + 1}</kbd>
          </button>
        ))}
      </div>

      {/* Visual resistor */}
      <div className="flex items-center justify-center gap-1 py-3" role="img" aria-label={`Resistor with ${bands} color bands`}>
        <div className="h-2 w-8 bg-muted-foreground/30 rounded-l" aria-hidden="true" />
        <div className="relative h-8 w-32 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-around px-3">
          {Array.from({ length: bands }).map((_, i) => {
            const c = getC(sel[i])
            return <div key={i} className="w-3 h-full rounded" style={{ backgroundColor: c?.bg ?? "#ccc" }} aria-hidden="true" />
          })}
        </div>
        <div className="h-2 w-8 bg-muted-foreground/30 rounded-r" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ColorSelect id="band-1" label="Band 1 (1st digit)" options={digitColors} value={sel[0]} onChange={v => setBand(0, v)} shortcut="1" />
        <ColorSelect id="band-2" label="Band 2 (2nd digit)" options={digitColors} value={sel[1]} onChange={v => setBand(1, v)} shortcut="2" />
        {bands === 5 && <ColorSelect id="band-3" label="Band 3 (3rd digit)" options={digitColors} value={sel[2]} onChange={v => setBand(2, v)} shortcut="3" />}
        <ColorSelect id="band-multiplier" label={`Band ${bands === 5 ? 4 : 3} (Multiplier)`} options={multColors} value={sel[multIdx]} onChange={v => setBand(multIdx, v)} shortcut={bands === 5 ? "4" : "3"} />
        <ColorSelect id="band-tolerance" label={`Band ${bands} (Tolerance)`} options={tolColors} value={sel[tolIdx]} onChange={v => setBand(tolIdx, v)} shortcut={bands === 5 ? "5" : "4"} />
      </div>

      {value !== null && (
        <div className="space-y-2" role="region" aria-label="Calculated resistance">
          <ResultRow label="Resistance" value={value} unit="Ω" highlight />
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 bg-muted/30 border border-border`} role="status" aria-live="polite" aria-label={`Tolerance: ${tolerance ?? "—"}`}>
            <span className="text-sm text-muted-foreground">Tolerance</span>
            <span className="font-mono text-sm font-semibold">{tolerance ?? "—"}</span>
          </div>
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 bg-muted/30 border border-border`} role="status" aria-live="polite" aria-label={`Resistance range`}>
            <span className="text-sm text-muted-foreground">Range</span>
            <span className="font-mono text-sm font-semibold">
              {tolerance && value ? `${fmt(value * (1 - parseFloat(tolerance) / 100), "Ω", 3)} – ${fmt(value * (1 + parseFloat(tolerance) / 100), "Ω", 3)}` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── RC / RL Time Constant ─────────────────────────────────────────────────────
function TimeConstant() {
  const [type, setType] = useState<"RC"|"RL">("RC")
  const [R, setR] = useState(""); const [C, setC] = useState(""); const [L, setL] = useState("")
  const r = n(R), c = n(C), l = n(L)
  const tau = type === "RC"
    ? (r !== null && c !== null ? r * c : null)
    : (r !== null && l !== null && r !== 0 ? l / r : null)

  return (
    <div className="space-y-4" role="region" aria-label="RC/RL time constant calculator">
      <div className="flex gap-2" role="radiogroup" aria-label="Circuit type">
        {(["RC","RL"] as const).map((t, idx) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            role="radio"
            aria-checked={type === t}
            aria-label={t === "RC" ? "RC circuit (Resistor-Capacitor)" : "RL circuit (Resistor-Inductor)"}
          >
            {t} Circuit<kbd className="ml-2 text-[9px] opacity-50" aria-hidden="true">{idx + 1}</kbd>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <FieldRow id="tau-resistance" label="Resistance (R)" value={R} unit="Ω" onChange={setR} shortcut="R" />
        {type === "RC"
          ? <FieldRow id="tau-capacitance" label="Capacitance (C)" value={C} unit="F" onChange={setC} placeholder="e.g. 0.001" shortcut="C" />
          : <FieldRow id="tau-inductance" label="Inductance (L)"  value={L} unit="H" onChange={setL} placeholder="e.g. 0.01" shortcut="L" />
        }
      </div>
      {tau !== null && (
        <div className="space-y-2" role="region" aria-label="Calculated results">
          <ResultRow label="Time Constant τ" value={tau} unit="s" highlight />
          <ResultRow label="5τ (99.3% charged)" value={tau * 5} unit="s" />
          <ResultRow label="Cutoff Freq fc = 1/(2πτ)" value={tau > 0 ? 1 / (2 * Math.PI * tau) : null} unit="Hz" />
        </div>
      )}
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-0.5" role="note">
        <p>{type === "RC" ? "τ = RC — capacitor reaches 63.2% at t=τ" : "τ = L/R — inductor reaches 63.2% at t=τ"}</p>
        <p className="opacity-60">IEC 60384 / IEC 61558 — passive component standards</p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "ohm",        label: "Ohm's Law",         component: OhmsLaw,           shortcut: "1" },
  { id: "ac",         label: "AC Reactance",       component: AcReactance,       shortcut: "2" },
  { id: "power",      label: "Power",              component: PowerCalc,         shortcut: "3" },
  { id: "3phase",     label: "Three-Phase",        component: ThreePhase,        shortcut: "4" },
  { id: "colors",     label: "Resistor Colors",    component: ResistorColorCode, shortcut: "5" },
  { id: "timeconst",  label: "RC/RL τ",            component: TimeConstant,      shortcut: "6" },
]

const shortcuts = [
  { keys: ["1"], description: "Ohm's Law calculator" },
  { keys: ["2"], description: "AC Reactance calculator" },
  { keys: ["3"], description: "Power calculator" },
  { keys: ["4"], description: "Three-Phase calculator" },
  { keys: ["5"], description: "Resistor Colors calculator" },
  { keys: ["6"], description: "RC/RL Time Constant calculator" },
  { keys: ["Escape"], description: "Blur focused input" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between controls" },
]

export default function ElectricalCalculator() {
  const [tab, setTab] = useState("ohm")
  const TabComponent = TABS.find(t => t.id === tab)?.component ?? OhmsLaw

  const setTabWithAnnounce = useCallback((newTab: string) => {
    setTab(newTab)
    const tabLabel = TABS.find(t => t.id === newTab)?.label
    if (tabLabel) {
      announceToScreenReader(`Switched to ${tabLabel} calculator`)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys 1-6 for tabs
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[1-6]$/.test(e.key)) {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        if (index < TABS.length) {
          setTabWithAnnounce(TABS[index].id)
          // Focus first input in new tab
          setTimeout(() => {
            const firstInput = document.querySelector('input[type="number"]') as HTMLInputElement
            firstInput?.focus()
          }, 100)
        }
      }

      // Escape to blur any focused input
      if (e.key === "Escape") {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement?.tagName === "INPUT") {
          activeElement.blur()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setTabWithAnnounce])

  return (
    <>
      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Electrical Calculator</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Electrical Calculator" shortcuts={shortcuts} />
          </div>
        </div>

        {/* MOBILE: compact header */}
        <div className="flex md:hidden shrink-0 items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Electrical Calculator</h2>
          <ShortcutsModal pageName="Electrical Calculator" shortcuts={shortcuts} />
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-4 min-h-0" style={{ minHeight: "calc(100vh - 10rem)" }}>
            {/* Tab sidebar */}
            <div className="shrink-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card w-48" role="region" aria-label="Calculator selection">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculators</span>
                <span className="ml-2 text-[10px] text-muted-foreground/60">(1-6)</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5" role="tablist" aria-label="Available calculators">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTabWithAnnounce(t.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    role="tab"
                    aria-selected={tab === t.id}
                    aria-label={`${t.label} (press ${t.shortcut})`}
                    title={`Press ${t.shortcut} to switch`}
                  >
                    {t.label}<kbd className="ml-auto float-right rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground" aria-hidden="true">{t.shortcut}</kbd>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Calculator content">
              <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
                <span className="font-semibold text-sm">{TABS.find(t => t.id === tab)?.label}</span>
                <Badge variant="outline" className="text-xs">IEC / IEEE</Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">Press <kbd className="px-1 border rounded text-[9px]">Tab</kbd> to navigate</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-lg space-y-4">
                  <TabComponent />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE: bottom action bar — minimal, no primary action needed */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex-1 overflow-x-auto flex gap-1" role="tablist" aria-label="Available calculators">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTabWithAnnounce(t.id)}
                className={`shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                role="tab"
                aria-selected={tab === t.id}
                aria-label={t.label}
              >
                {t.shortcut}
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
