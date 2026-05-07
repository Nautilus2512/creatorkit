"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── CV Preview (inline styles so print matches exactly) ─────────────────────
const ACCENT = { classic: "#1a1a1a", modern: "#4f46e5" }

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
      {/* Header */}
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

      {/* Summary */}
      {p.summary && (
        <div style={sectionStyle}>
          <div style={headingStyle}>Summary</div>
          <div style={{ color: "#333" }}>{p.summary}</div>
        </div>
      )}

      {/* Experience */}
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

      {/* Education */}
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

      {/* Skills */}
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

      {/* Projects */}
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

// ─── Collapsible section wrapper ──────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

// ─── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CvMaker() {
  const [cv, setCv] = useState<CVData>(BLANK)
  const [template, setTemplate] = useState<"classic" | "modern">("modern")
  const [skillInput, setSkillInput] = useState("")
  const [confirmingClear, setConfirmingClear] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCv(load())
    const t = localStorage.getItem("creatorkit-cv-template")
    if (t === "classic" || t === "modern") setTemplate(t)
  }, [])

  // Cleanup confirm timer on unmount
  useEffect(() => () => { clearTimeout(confirmTimerRef.current!) }, [])

  const update = (patch: Partial<CVData>) => {
    setCv(prev => { const next = { ...prev, ...patch }; persist(next); return next })
  }

  const updatePersonal = (patch: Partial<CVData["personal"]>) => {
    update({ personal: { ...cv.personal, ...patch } })
  }

  // Experience
  const addExp = () => update({ experience: [...cv.experience, newExp()] })
  const updateExp = (id: string, patch: Partial<Experience>) =>
    update({ experience: cv.experience.map(e => e.id === id ? { ...e, ...patch } : e) })
  const removeExp = (id: string) => update({ experience: cv.experience.filter(e => e.id !== id) })

  // Education
  const addEdu = () => update({ education: [...cv.education, newEdu()] })
  const updateEdu = (id: string, patch: Partial<Education>) =>
    update({ education: cv.education.map(e => e.id === id ? { ...e, ...patch } : e) })
  const removeEdu = (id: string) => update({ education: cv.education.filter(e => e.id !== id) })

  // Skills
  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || cv.skills.includes(s)) return
    update({ skills: [...cv.skills, s] })
    setSkillInput("")
  }
  const removeSkill = (s: string) => update({ skills: cv.skills.filter(k => k !== s) })

  // Projects
  const addProj = () => update({ projects: [...cv.projects, newProj()] })
  const updateProj = (id: string, patch: Partial<Project>) =>
    update({ projects: cv.projects.map(p => p.id === id ? { ...p, ...patch } : p) })
  const removeProj = (id: string) => update({ projects: cv.projects.filter(p => p.id !== id) })

  // Template
  const setTmpl = (t: "classic" | "modern") => {
    setTemplate(t)
    localStorage.setItem("creatorkit-cv-template", t)
  }

  // Clear all CV data (two-step confirm to avoid accidents)
  const handleClear = () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      confirmTimerRef.current = setTimeout(() => setConfirmingClear(false), 3000)
    } else {
      clearTimeout(confirmTimerRef.current!)
      setCv(BLANK)
      persist(BLANK)
      setSkillInput("")
      setConfirmingClear(false)
    }
  }

  // Print — uses blob URL instead of deprecated document.write
  const handlePrint = () => {
    const el = previewRef.current
    if (!el) return
    const html = `<!DOCTYPE html><html><head><title>${cv.personal.name || "CV"}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{background:white}@page{margin:0;size:A4}</style>
      </head><body>${el.innerHTML}</body></html>`
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, "_blank")
    if (!w) return
    w.addEventListener("load", () => {
      w.focus()
      setTimeout(() => { w.print(); URL.revokeObjectURL(url) }, 300)
    })
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">CV Maker</h1>
            <p className="text-sm text-muted-foreground">
              Saved locally in your browser only — never uploaded.{" "}
              <button
                onClick={handleClear}
                className={`underline underline-offset-2 transition-colors ${
                  confirmingClear
                    ? "text-destructive font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {confirmingClear ? "Click again to confirm clear" : "Clear all data"}
              </button>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Template selector */}
            <div className="flex items-center gap-1">
              {(["classic", "modern"] as const).map(t => (
                <button key={t} onClick={() => setTmpl(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${template === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {t}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-1" />Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Form */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border overflow-y-auto md:w-[380px] md:shrink-0">
          <div className="p-4 space-y-3">

            {/* Personal Info */}
            <Section title="Personal Information">
              <Field label="Full Name">
                <Input value={cv.personal.name} onChange={e => updatePersonal({ name: e.target.value })} placeholder="Jane Smith" />
              </Field>
              <Field label="Professional Title">
                <Input value={cv.personal.title} onChange={e => updatePersonal({ title: e.target.value })} placeholder="Senior Software Engineer" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Email">
                  <Input value={cv.personal.email} onChange={e => updatePersonal({ email: e.target.value })} placeholder="jane@email.com" />
                </Field>
                <Field label="Phone">
                  <Input value={cv.personal.phone} onChange={e => updatePersonal({ phone: e.target.value })} placeholder="+1 234 567 8900" />
                </Field>
              </div>
              <Field label="Location">
                <Input value={cv.personal.location} onChange={e => updatePersonal({ location: e.target.value })} placeholder="New York, NY" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Website">
                  <Input value={cv.personal.website} onChange={e => updatePersonal({ website: e.target.value })} placeholder="janesmith.dev" />
                </Field>
                <Field label="LinkedIn">
                  <Input value={cv.personal.linkedin} onChange={e => updatePersonal({ linkedin: e.target.value })} placeholder="linkedin.com/in/jane" />
                </Field>
              </div>
              <Field label="Professional Summary">
                <Textarea value={cv.personal.summary} onChange={e => updatePersonal({ summary: e.target.value })}
                  placeholder="Brief overview of your background and what you bring to the table..."
                  rows={3} className="resize-none text-sm" />
              </Field>
            </Section>

            {/* Experience */}
            <Section title={`Experience (${cv.experience.length})`}>
              {cv.experience.map((e, i) => (
                <div key={e.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    <button onClick={() => removeExp(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input value={e.position} onChange={ev => updateExp(e.id, { position: ev.target.value })} placeholder="Position / Job Title" className="text-sm" />
                  <Input value={e.company} onChange={ev => updateExp(e.id, { company: ev.target.value })} placeholder="Company Name" className="text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={e.startDate} onChange={ev => updateExp(e.id, { startDate: ev.target.value })} placeholder="Jan 2022" className="text-sm" />
                    <Input value={e.endDate} onChange={ev => updateExp(e.id, { endDate: ev.target.value })} placeholder="Dec 2023" disabled={e.current} className="text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id={`cur-${e.id}`} checked={e.current} onCheckedChange={v => updateExp(e.id, { current: v })} />
                    <Label htmlFor={`cur-${e.id}`} className="text-xs cursor-pointer">Currently working here</Label>
                  </div>
                  <Textarea value={e.description} onChange={ev => updateExp(e.id, { description: ev.target.value })}
                    placeholder="• Describe your responsibilities and achievements&#10;• Use bullet points for clarity" rows={3} className="resize-none text-sm" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addExp} className="w-full">
                <Plus className="h-4 w-4 mr-1" />Add Experience
              </Button>
            </Section>

            {/* Education */}
            <Section title={`Education (${cv.education.length})`} defaultOpen={false}>
              {cv.education.map((e, i) => (
                <div key={e.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    <button onClick={() => removeEdu(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input value={e.institution} onChange={ev => updateEdu(e.id, { institution: ev.target.value })} placeholder="University / Institution" className="text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={e.degree} onChange={ev => updateEdu(e.id, { degree: ev.target.value })} placeholder="BS / MS / PhD" className="text-sm" />
                    <Input value={e.field} onChange={ev => updateEdu(e.id, { field: ev.target.value })} placeholder="Computer Science" className="text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={e.startDate} onChange={ev => updateEdu(e.id, { startDate: ev.target.value })} placeholder="2018" className="text-sm" />
                    <Input value={e.endDate} onChange={ev => updateEdu(e.id, { endDate: ev.target.value })} placeholder="2022" className="text-sm" />
                    <Input value={e.gpa} onChange={ev => updateEdu(e.id, { gpa: ev.target.value })} placeholder="GPA 3.8" className="text-sm" />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEdu} className="w-full">
                <Plus className="h-4 w-4 mr-1" />Add Education
              </Button>
            </Section>

            {/* Skills */}
            <Section title={`Skills (${cv.skills.length})`} defaultOpen={false}>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSkill()}
                  placeholder="e.g. TypeScript, React, AWS..." className="text-sm" />
                <Button size="sm" variant="outline" onClick={addSkill}>Add</Button>
              </div>
              {cv.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cv.skills.map(s => (
                    <span key={s} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {s}
                      <button onClick={() => removeSkill(s)} className="hover:text-destructive ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Press Enter or click Add after each skill</p>
            </Section>

            {/* Projects */}
            <Section title={`Projects (${cv.projects.length})`} defaultOpen={false}>
              {cv.projects.map((p, i) => (
                <div key={p.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    <button onClick={() => removeProj(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input value={p.name} onChange={e => updateProj(p.id, { name: e.target.value })} placeholder="Project Name" className="text-sm" />
                  <Input value={p.url} onChange={e => updateProj(p.id, { url: e.target.value })} placeholder="github.com/you/project (optional)" className="text-sm" />
                  <Textarea value={p.description} onChange={e => updateProj(p.id, { description: e.target.value })}
                    placeholder="What did you build and what was the impact?" rows={2} className="resize-none text-sm" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addProj} className="w-full">
                <Plus className="h-4 w-4 mr-1" />Add Project
              </Button>
            </Section>

          </div>
        </div>

        {/* Right — Live preview */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-6">
          <div ref={previewRef} className="shadow-xl">
            <CvPreview cv={cv} tmpl={template} />
          </div>
        </div>
      </div>
    </div>
  )
}
