"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Plus, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

interface Experience {
  id: string; company: string; position: string
  startDate: string; endDate: string; current: boolean; description: string
}
interface Education {
  id: string; institution: string; degree: string
  field: string; startDate: string; endDate: string; gpa: string
}
interface Project {
  id: string; name: string; description: string; url: string
}
interface CVData {
  personal: {
    name: string; title: string; email: string; phone: string
    location: string; website: string; linkedin: string; summary: string
  }
  experience: Experience[]
  education: Education[]
  skills: string[]
  projects: Project[]
}

const BLANK: CVData = {
  personal: { name: "", title: "", email: "", phone: "", location: "", website: "", linkedin: "", summary: "" },
  experience: [], education: [], skills: [], projects: [],
}

const KEY = "creatorkit-cv"
const load = (): CVData => { try { return JSON.parse(localStorage.getItem(KEY) || JSON.stringify(BLANK)) } catch { return BLANK } }
const persist = (d: CVData) => { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {} }

const uid = () => crypto.randomUUID()
const newExp = (): Experience => ({ id: uid(), company: "", position: "", startDate: "", endDate: "", current: false, description: "" })
const newEdu = (): Education => ({ id: uid(), institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" })
const newProj = (): Project => ({ id: uid(), name: "", description: "", url: "" })

const ACCENT = { classic: "#1a1a1a", modern: "#4f46e5" }

const shortcuts = [
  { keys: ["1"], description: "Classic template" },
  { keys: ["2"], description: "Modern template" },
  { keys: ["Ctrl", "Shift", "E"], description: "Add experience entry" },
  { keys: ["Ctrl", "Shift", "L"], description: "Add education entry" },
  { keys: ["Ctrl", "Shift", "Y"], description: "Focus skills input" },
  { keys: ["Ctrl", "Shift", "P"], description: "Add project entry" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download PDF" },
  { keys: ["Ctrl", "Shift", "X"], description: "Clear all data" },
  { keys: ["Escape"], description: "Focus name input / blur current field" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between fields" },
  { keys: ["Enter"], description: "Add skill (when in skill input)" },
]

function CvPreview({ cv, tmpl }: { cv: CVData; tmpl: "classic" | "modern" }) {
  const { personal: p, experience, education, skills, projects } = cv
  const accent = ACCENT[tmpl]
  const hasAny = p.name || experience.length > 0 || education.length > 0 || skills.length > 0

  if (!hasAny) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "14px" }}>
      Fill in your details to see a preview
    </div>
  )

  const sectionStyle: React.CSSProperties = { marginBottom: "5mm" }
  const headingStyle: React.CSSProperties = {
    fontSize: "9.5pt", fontWeight: "bold", textTransform: "uppercase",
    letterSpacing: "0.1em", color: accent,
    borderBottom: `1.5px solid ${accent}`, paddingBottom: "1mm", marginBottom: "3mm",
  }

  return (
    <div style={{
      background: "white", color: "#1a1a1a",
      width: "210mm", minHeight: "297mm",
      padding: "14mm 16mm", boxSizing: "border-box",
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "9.5pt", lineHeight: "1.45",
    }}>
      <div style={{ borderBottom: `2.5px solid ${accent}`, paddingBottom: "5mm", marginBottom: "5mm" }}>
        {p.name && <div style={{ fontSize: "22pt", fontWeight: "bold", color: accent, letterSpacing: "0.01em", lineHeight: 1.1 }}>{p.name}</div>}
        {p.title && <div style={{ fontSize: "11.5pt", color: "#555", margin: "1.5mm 0 2.5mm" }}>{p.title}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: "6mm", rowGap: "0.5mm", fontSize: "8.5pt", color: "#555" }}>
          {p.email    && <span>✉ {p.email}</span>}
          {p.phone    && <span>✆ {p.phone}</span>}
          {p.location && <span>📍 {p.location}</span>}
          {p.website  && <span>🔗 {p.website}</span>}
          {p.linkedin && <span>in {p.linkedin}</span>}
        </div>
      </div>

      {p.summary && (
        <div style={sectionStyle}>
          <div style={headingStyle}>Summary</div>
          <div style={{ color: "#333" }}>{p.summary}</div>
        </div>
      )}

      {experience.length > 0 && (
        <div style={sectionStyle}>
          <div style={headingStyle}>Experience</div>
          {experience.map(e => (
            <div key={e.id} style={{ marginBottom: "4mm" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: "10.5pt" }}>{e.position || "—"}</strong>
                <span style={{ fontSize: "8.5pt", color: "#666" }}>
                  {[e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – ")}
                </span>
              </div>
              {e.company && <div style={{ color: accent, fontSize: "9.5pt", marginBottom: "1mm" }}>{e.company}</div>}
              {e.description && <div style={{ color: "#444", fontSize: "9pt", whiteSpace: "pre-wrap" }}>{e.description}</div>}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div style={sectionStyle}>
          <div style={headingStyle}>Education</div>
          {education.map(e => (
            <div key={e.id} style={{ marginBottom: "3mm" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{e.institution || "—"}</strong>
                <span style={{ fontSize: "8.5pt", color: "#666" }}>
                  {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                </span>
              </div>
              <div style={{ color: "#555", fontSize: "9pt" }}>
                {[e.degree, e.field].filter(Boolean).join(", ")}
                {e.gpa && ` · GPA ${e.gpa}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div style={sectionStyle}>
          <div style={headingStyle}>Skills</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm" }}>
            {skills.map((s, i) => (
              <span key={i} style={{
                background: tmpl === "modern" ? "#eef2ff" : "#f3f4f6",
                color: tmpl === "modern" ? accent : "#333",
                padding: "0.5mm 3mm", borderRadius: "2mm", fontSize: "8.5pt",
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={sectionStyle}>
          <div style={headingStyle}>Projects</div>
          {projects.map(pr => (
            <div key={pr.id} style={{ marginBottom: "3mm" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{pr.name || "—"}</strong>
                {pr.url && <span style={{ color: accent, fontSize: "8.5pt" }}>{pr.url}</span>}
              </div>
              {pr.description && <div style={{ color: "#444", fontSize: "9pt" }}>{pr.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-expanded={open}
      >
        {title}
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        }
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export default function CvMaker() {
  const [cv, setCv] = useState<CVData>(BLANK)
  const [template, setTemplate] = useState<"classic" | "modern">("modern")
  const [skillInput, setSkillInput] = useState("")
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const previewRef     = useRef<HTMLDivElement>(null)
  const previewPaneRef = useRef<HTMLDivElement>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewScale, setPreviewScale] = useState(1)

  useEffect(() => {
    setCv(load())
    const t = localStorage.getItem("creatorkit-cv-template")
    if (t === "classic" || t === "modern") setTemplate(t)
  }, [])

  useEffect(() => () => { clearTimeout(confirmTimerRef.current!) }, [])

  useEffect(() => {
    const el = previewPaneRef.current
    if (!el) return
    const CV_W_PX = (210 / 25.4) * 96
    const measure = () => setPreviewScale(Math.min(1, (el.clientWidth - 32) / CV_W_PX))
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const update = useCallback((patch: Partial<CVData>) => {
    setCv(prev => { const next = { ...prev, ...patch }; persist(next); return next })
  }, [])

  const updatePersonal = useCallback((patch: Partial<CVData["personal"]>) => {
    setCv(prev => { const next = { ...prev, personal: { ...prev.personal, ...patch } }; persist(next); return next })
  }, [])

  const addExp = useCallback(() => {
    update({ experience: [...cv.experience, newExp()] })
    announceToScreenReader('Experience entry added')
  }, [cv.experience, update])
  const updateExp = useCallback((id: string, patch: Partial<Experience>) =>
    update({ experience: cv.experience.map(e => e.id === id ? { ...e, ...patch } : e) }), [cv.experience, update])
  const removeExp = useCallback((id: string) => {
    update({ experience: cv.experience.filter(e => e.id !== id) })
    announceToScreenReader('Experience entry removed')
  }, [cv.experience, update])

  const addEdu = useCallback(() => {
    update({ education: [...cv.education, newEdu()] })
    announceToScreenReader('Education entry added')
  }, [cv.education, update])
  const updateEdu = useCallback((id: string, patch: Partial<Education>) =>
    update({ education: cv.education.map(e => e.id === id ? { ...e, ...patch } : e) }), [cv.education, update])
  const removeEdu = useCallback((id: string) => {
    update({ education: cv.education.filter(e => e.id !== id) })
    announceToScreenReader('Education entry removed')
  }, [cv.education, update])

  const addSkill = useCallback(() => {
    const s = skillInput.trim()
    if (!s || cv.skills.includes(s)) {
      if (s) announceToScreenReader('Skill already exists')
      return
    }
    update({ skills: [...cv.skills, s] })
    setSkillInput("")
    announceToScreenReader(`Skill "${s}" added`)
  }, [skillInput, cv.skills, update])
  const removeSkill = useCallback((s: string) => {
    update({ skills: cv.skills.filter(k => k !== s) })
    announceToScreenReader(`Skill "${s}" removed`)
  }, [cv.skills, update])

  const addProj = useCallback(() => {
    update({ projects: [...cv.projects, newProj()] })
    announceToScreenReader('Project entry added')
  }, [cv.projects, update])
  const updateProj = useCallback((id: string, patch: Partial<Project>) =>
    update({ projects: cv.projects.map(p => p.id === id ? { ...p, ...patch } : p) }), [cv.projects, update])
  const removeProj = useCallback((id: string) => {
    update({ projects: cv.projects.filter(p => p.id !== id) })
    announceToScreenReader('Project entry removed')
  }, [cv.projects, update])

  const setTmpl = useCallback((t: "classic" | "modern") => {
    setTemplate(t)
    localStorage.setItem("creatorkit-cv-template", t)
    announceToScreenReader(`Template changed to ${t}`)
  }, [])

  const handleClear = useCallback(() => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      announceToScreenReader('Press again to confirm clearing all data')
      confirmTimerRef.current = setTimeout(() => {
        setConfirmingClear(false)
        announceToScreenReader('Clear action cancelled')
      }, 3000)
    } else {
      clearTimeout(confirmTimerRef.current!)
      setCv(BLANK)
      persist(BLANK)
      setSkillInput("")
      setConfirmingClear(false)
      announceToScreenReader('All CV data cleared')
    }
  }, [confirmingClear])

  const handlePrint = useCallback(() => {
    const el = previewRef.current
    if (!el) return
    const html = `<!DOCTYPE html><html><head><title>${cv.personal.name || "CV"}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{background:white}@page{margin:0;size:A4}</style>
      </head><body>${el.innerHTML}</body></html>`
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, "_blank")
    if (!w) {
      announceToScreenReader('Popup blocked. Please allow popups to download PDF.')
      return
    }
    announceToScreenReader('Opening PDF preview. Please wait...')
    w.addEventListener("load", () => {
      w.focus()
      setTimeout(() => { w.print(); URL.revokeObjectURL(url) }, 300)
    })
  }, [cv.personal.name])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur()
          return
        }
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "1" || e.key === "2")) {
        e.preventDefault()
        setTmpl(e.key === "1" ? "classic" : "modern")
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        addExp()
        document.getElementById('experience-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault()
        addEdu()
        document.getElementById('education-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "y") {
        e.preventDefault()
        ;(document.getElementById('skill-input') as HTMLInputElement)?.focus()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        addProj()
        document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handlePrint()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault()
        handleClear()
      }

      if (e.key === "Escape") {
        ;(document.getElementById('name-input') as HTMLInputElement)?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setTmpl, addExp, addEdu, addProj, handlePrint, handleClear])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">CV Maker</span>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex items-center gap-1" role="radiogroup" aria-label="CV template">
          {(["classic", "modern"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTmpl(t)}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                template === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
              role="radio"
              aria-checked={template === t}
              aria-label={`${t} template (press ${t === 'classic' ? '1' : '2'})`}
            >
              {t}
              <kbd
                className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
                  template === t
                    ? "border-primary-foreground/30 bg-primary-foreground/20"
                    : "border-border bg-muted"
                }`}
                aria-hidden="true"
              >
                {t === 'classic' ? '1' : '2'}
              </kbd>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="CV Maker" shortcuts={shortcuts} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label={confirmingClear ? "Click again to confirm clearing all CV data" : "Clear all CV data"}
            className={confirmingClear ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-destructive"}
          >
            <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
            {confirmingClear ? "Confirm?" : "Clear data"}
          </Button>
          <Button size="sm" onClick={handlePrint} aria-label="Download PDF">
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Download PDF
            <kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">CV Maker</h2>
          <ShortcutsModal pageName="CV Maker" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Form
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* PANELS CARD */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Left — Form */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden md:border-r border-border`}
            role="region"
            aria-label="CV editor form"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Edit CV</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              <Section title="Personal Information">
                <Field label="Full Name">
                  <Input
                    id="name-input"
                    value={cv.personal.name}
                    onChange={e => updatePersonal({ name: e.target.value })}
                    placeholder="Jane Smith"
                    aria-label="Full name"
                  />
                </Field>
                <Field label="Professional Title">
                  <Input
                    value={cv.personal.title}
                    onChange={e => updatePersonal({ title: e.target.value })}
                    placeholder="Senior Software Engineer"
                    aria-label="Professional title"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email">
                    <Input
                      value={cv.personal.email}
                      onChange={e => updatePersonal({ email: e.target.value })}
                      placeholder="jane@email.com"
                      aria-label="Email address"
                      type="email"
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={cv.personal.phone}
                      onChange={e => updatePersonal({ phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                      aria-label="Phone number"
                      type="tel"
                    />
                  </Field>
                </div>
                <Field label="Location">
                  <Input
                    value={cv.personal.location}
                    onChange={e => updatePersonal({ location: e.target.value })}
                    placeholder="New York, NY"
                    aria-label="Location"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Website">
                    <Input
                      value={cv.personal.website}
                      onChange={e => updatePersonal({ website: e.target.value })}
                      placeholder="janesmith.dev"
                      aria-label="Website URL"
                      type="url"
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <Input
                      value={cv.personal.linkedin}
                      onChange={e => updatePersonal({ linkedin: e.target.value })}
                      placeholder="linkedin.com/in/jane"
                      aria-label="LinkedIn profile"
                    />
                  </Field>
                </div>
                <Field label="Professional Summary">
                  <Textarea
                    value={cv.personal.summary}
                    onChange={e => updatePersonal({ summary: e.target.value })}
                    placeholder="Brief overview of your background and what you bring to the table..."
                    rows={3}
                    className="resize-none text-sm"
                    aria-label="Professional summary"
                  />
                </Field>
              </Section>

              <div id="experience-section">
                <Section title={`Experience (${cv.experience.length})`}>
                  {cv.experience.map((e, i) => (
                    <div key={e.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/10" role="group" aria-label={`Experience ${i + 1}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                        <button
                          onClick={() => removeExp(e.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                          aria-label={`Remove experience ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <Input value={e.position} onChange={ev => updateExp(e.id, { position: ev.target.value })} placeholder="Position / Job Title" className="text-sm" aria-label="Job position" />
                      <Input value={e.company} onChange={ev => updateExp(e.id, { company: ev.target.value })} placeholder="Company Name" className="text-sm" aria-label="Company name" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={e.startDate} onChange={ev => updateExp(e.id, { startDate: ev.target.value })} placeholder="Jan 2022" className="text-sm" aria-label="Start date" />
                        <Input value={e.endDate} onChange={ev => updateExp(e.id, { endDate: ev.target.value })} placeholder="Dec 2023" disabled={e.current} className="text-sm" aria-label="End date" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id={`cur-${e.id}`} checked={e.current} onCheckedChange={v => updateExp(e.id, { current: v })} aria-label="Currently working here" />
                        <Label htmlFor={`cur-${e.id}`} className="text-xs cursor-pointer">Currently working here</Label>
                      </div>
                      <Textarea value={e.description} onChange={ev => updateExp(e.id, { description: ev.target.value })} placeholder="• Describe your responsibilities and achievements&#10;• Use bullet points for clarity" rows={3} className="resize-none text-sm" aria-label="Job description" />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addExp} className="w-full" aria-label="Add experience entry">
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add Experience
                    <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
                  </Button>
                </Section>
              </div>

              <div id="education-section">
                <Section title={`Education (${cv.education.length})`} defaultOpen={false}>
                  {cv.education.map((e, i) => (
                    <div key={e.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/10" role="group" aria-label={`Education ${i + 1}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                        <button
                          onClick={() => removeEdu(e.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                          aria-label={`Remove education ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <Input value={e.institution} onChange={ev => updateEdu(e.id, { institution: ev.target.value })} placeholder="University / Institution" className="text-sm" aria-label="Institution name" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={e.degree} onChange={ev => updateEdu(e.id, { degree: ev.target.value })} placeholder="BS / MS / PhD" className="text-sm" aria-label="Degree" />
                        <Input value={e.field} onChange={ev => updateEdu(e.id, { field: ev.target.value })} placeholder="Computer Science" className="text-sm" aria-label="Field of study" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={e.startDate} onChange={ev => updateEdu(e.id, { startDate: ev.target.value })} placeholder="2018" className="text-sm" aria-label="Start year" />
                        <Input value={e.endDate} onChange={ev => updateEdu(e.id, { endDate: ev.target.value })} placeholder="2022" className="text-sm" aria-label="End year" />
                        <Input value={e.gpa} onChange={ev => updateEdu(e.id, { gpa: ev.target.value })} placeholder="GPA 3.8" className="text-sm" aria-label="GPA" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addEdu} className="w-full" aria-label="Add education entry">
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add Education
                    <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+L</kbd>
                  </Button>
                </Section>
              </div>

              <Section title={`Skills (${cv.skills.length})`} defaultOpen={false}>
                <div className="flex gap-2">
                  <Input
                    id="skill-input"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSkill()}
                    placeholder="e.g. TypeScript, React, AWS..."
                    className="text-sm"
                    aria-label="Add skill"
                  />
                  <Button size="sm" variant="outline" onClick={addSkill} aria-label="Add skill">
                    Add<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Enter</kbd>
                  </Button>
                </div>
                {cv.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1" role="list" aria-label={`${cv.skills.length} skills`}>
                    {cv.skills.map(s => (
                      <span key={s} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full" role="listitem">
                        {s}
                        <button
                          onClick={() => removeSkill(s)}
                          className="hover:text-destructive ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                          aria-label={`Remove skill ${s}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Press Enter or click Add after each skill. Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+Y</kbd> to focus this field.</p>
              </Section>

              <div id="projects-section">
                <Section title={`Projects (${cv.projects.length})`} defaultOpen={false}>
                  {cv.projects.map((p, i) => (
                    <div key={p.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/10" role="group" aria-label={`Project ${i + 1}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                        <button
                          onClick={() => removeProj(p.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                          aria-label={`Remove project ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <Input value={p.name} onChange={e => updateProj(p.id, { name: e.target.value })} placeholder="Project Name" className="text-sm" aria-label="Project name" />
                      <Input value={p.url} onChange={e => updateProj(p.id, { url: e.target.value })} placeholder="github.com/you/project (optional)" className="text-sm" aria-label="Project URL" type="url" />
                      <Textarea value={p.description} onChange={e => updateProj(p.id, { description: e.target.value })} placeholder="What did you build and what was the impact?" rows={2} className="resize-none text-sm" aria-label="Project description" />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addProj} className="w-full" aria-label="Add project entry">
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add Project
                    <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+P</kbd>
                  </Button>
                </Section>
              </div>

            </div>
          </div>

          {/* Right — Live preview */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden`}
            role="region"
            aria-label="CV preview"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Preview</span>
              {cv.personal.name && (
                <span className="text-xs text-muted-foreground ml-2">{cv.personal.name}</span>
              )}
            </div>
            <div ref={previewPaneRef} className="flex-1 overflow-y-auto bg-muted/30 p-4">
              <div className="flex justify-center">
                <div ref={previewRef} style={{ zoom: previewScale }} className="shadow-xl" role="document" aria-label={`${template} CV preview`}>
                  <CvPreview cv={cv} tmpl={template} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* USAGE GUIDE */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Fill in your details in the <span className="text-foreground font-medium">Form</span> panel. The <span className="text-foreground font-medium">Preview</span> panel updates live as you type.</li>
              <li>Choose a template style using the <span className="text-foreground font-medium">Classic</span> or <span className="text-foreground font-medium">Modern</span> buttons in the toolbar, or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> / <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd>.</li>
              <li>Click <span className="text-foreground font-medium">Download PDF</span> to open a print dialog. In the dialog, set destination to <span className="text-foreground font-medium">Save as PDF</span> and margins to <span className="text-foreground font-medium">None</span> for best results.</li>
              <li>Your data is saved automatically in your browser. It will still be here when you return.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> / <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> switch between Classic and Modern templates.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+E</kbd> adds a new Experience entry and scrolls to it.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd> adds a new Education entry and scrolls to it.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+Y</kbd> focuses the Skills input so you can type a skill immediately.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+P</kbd> adds a new Project entry and scrolls to it.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd> opens the PDF download dialog.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+X</kbd> clears all CV data (requires a second press to confirm).</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>In Experience descriptions, use <span className="text-foreground font-medium">bullet points</span> (one per line starting with •) for cleaner formatting in the PDF.</li>
              <li>The preview is scaled to fit the panel. The actual PDF will always be full A4 size regardless of the zoom level shown.</li>
              <li>On mobile, use the <span className="text-foreground font-medium">Form</span> and <span className="text-foreground font-medium">Preview</span> tabs to switch between editing and checking your CV.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
        </div>

        {/* Spacer so fixed mobile bar does not cover last content */}
        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          variant="ghost"
          size="sm"
          className={`h-11 px-3 ${confirmingClear ? "text-destructive" : "text-muted-foreground"}`}
          onClick={handleClear}
          aria-label={confirmingClear ? "Tap again to confirm clearing all CV data" : "Clear all CV data"}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={handlePrint} aria-label="Download PDF">
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />Download PDF
        </Button>
      </div>

    </div>
  )
}
