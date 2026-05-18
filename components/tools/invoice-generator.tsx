"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Trash2, Download, RotateCcw, FileCheck, Upload, X, BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

interface LineItem { id: string; description: string; qty: string; price: string }
interface Form {
  fromName: string; fromAddress: string; fromEmail: string; fromPhone: string
  toName: string; toAddress: string; toEmail: string
  invoiceNum: string; date: string; dueDate: string
  currency: string; taxRate: string
  discountType: "%" | "flat"; discountValue: string
  logoDataUrl: string
  isPaid: boolean
  notes: string
  items: LineItem[]
}

const DEFAULT: Form = {
  fromName: "", fromAddress: "", fromEmail: "", fromPhone: "",
  toName: "", toAddress: "", toEmail: "",
  invoiceNum: "INV-001",
  date: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  currency: "USD", taxRate: "0",
  discountType: "%", discountValue: "0",
  logoDataUrl: "",
  isPaid: false,
  notes: "",
  items: [{ id: "1", description: "", qty: "1", price: "" }],
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "MYR", "SGD", "INR"]

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(isNaN(n) ? 0 : n)
}

function buildHtml(f: Form, sub: number, discount: number, tax: number, total: number) {
  const currency = f.currency
  const rows = f.items.filter(i => i.description).map(i => {
    const qty = parseFloat(i.qty) || 0, price = parseFloat(i.price) || 0
    return `<tr><td>${i.description}</td><td style="text-align:center">${qty}</td><td style="text-align:right">${fmt(price, currency)}</td><td style="text-align:right">${fmt(qty * price, currency)}</td></tr>`
  }).join("")
  const taxRate = parseFloat(f.taxRate) || 0
  const discountVal = parseFloat(f.discountValue) || 0
  const discountLabel = f.discountType === "%" ? `Discount (${discountVal}%)` : "Discount"
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${f.invoiceNum}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;padding:48px;font-size:14px;line-height:1.6;position:relative}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.from-name{font-size:22px;font-weight:700;margin-bottom:4px}.meta-right{text-align:right}
.inv-title{font-size:28px;font-weight:800;color:#2563eb}.inv-meta{margin-top:8px;color:#555}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px}
.section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
.totals{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-bottom:32px}
.total-row{display:flex;min-width:240px;justify-content:space-between;gap:40px}
.total-label{color:#555}.total-value{font-weight:500;text-align:right}
.grand{font-size:17px;font-weight:800;color:#2563eb;padding-top:8px;border-top:2px solid #2563eb}
.notes{border-top:1px solid #e2e8f0;padding-top:20px;margin-top:16px;color:#555;font-size:13px}
.paid-stamp{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:80px;font-weight:900;color:rgba(34,197,94,0.18);border:8px solid rgba(34,197,94,0.18);padding:12px 32px;border-radius:12px;letter-spacing:0.15em;pointer-events:none}
@media print{body{padding:0}@page{margin:20mm}}
</style></head><body>
${f.isPaid ? `<div class="paid-stamp">PAID</div>` : ""}
<div class="header">
  <div>
    ${f.logoDataUrl ? `<img src="${f.logoDataUrl}" style="max-height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:8px;" alt="Business logo" />` : ""}
    <div class="from-name">${f.fromName || "Your Business"}</div>
    <div style="color:#555;white-space:pre-line">${f.fromAddress}</div>
    ${f.fromEmail ? `<div>${f.fromEmail}</div>` : ""}
    ${f.fromPhone ? `<div>${f.fromPhone}</div>` : ""}
  </div>
  <div class="meta-right"><div class="inv-title">INVOICE</div><div class="inv-meta"><b>#${f.invoiceNum}</b><br>Date: ${f.date}<br>Due: ${f.dueDate}</div></div>
</div>
<div class="parties">
  <div><div class="section-label">Bill From</div><b>${f.fromName || "-"}</b><br><span style="white-space:pre-line;color:#555">${f.fromAddress}</span></div>
  <div><div class="section-label">Bill To</div><b>${f.toName || "-"}</b><br><span style="white-space:pre-line;color:#555">${f.toAddress}</span>${f.toEmail ? `<br>${f.toEmail}` : ""}</div>
</div>
<table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
  <div class="total-row"><span class="total-label">Subtotal</span><span class="total-value">${fmt(sub, currency)}</span></div>
  ${discount > 0 ? `<div class="total-row"><span class="total-label">${discountLabel}</span><span class="total-value">-${fmt(discount, currency)}</span></div>` : ""}
  ${taxRate > 0 ? `<div class="total-row"><span class="total-label">Tax (${taxRate}%)</span><span class="total-value">${fmt(tax, currency)}</span></div>` : ""}
  <div class="total-row grand"><span>Total</span><span>${fmt(total, currency)}</span></div>
</div>
${f.notes ? `<div class="notes"><div class="section-label">Notes</div><p>${f.notes}</p></div>` : ""}
</body></html>`
}

function Field({ label, value, onChange, placeholder = "", type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  )
}

export default function InvoiceGenerator() {
  const [form, setForm] = useState<Form>(DEFAULT)
  const [downloaded, setDownloaded] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const printedRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem("creatorkit-invoice")
    if (saved) try { setForm(JSON.parse(saved)) } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem("creatorkit-invoice", JSON.stringify(form))
  }, [form])

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v })), [])

  const addItem = () => set("items", [...form.items, { id: Date.now().toString(), description: "", qty: "1", price: "" }])
  const removeItem = (id: string) => set("items", form.items.filter(i => i.id !== id))
  const updateItem = (id: string, k: keyof LineItem, v: string) =>
    set("items", form.items.map(i => i.id === id ? { ...i, [k]: v } : i))

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0)
  const discountAmt = form.discountType === "%"
    ? subtotal * (parseFloat(form.discountValue) || 0) / 100
    : (parseFloat(form.discountValue) || 0)
  const taxableAmount = subtotal - discountAmt
  const taxAmt = taxableAmount * (parseFloat(form.taxRate) || 0) / 100
  const total = taxableAmount + taxAmt
  const currency = form.currency

  const printInvoice = useCallback(() => {
    const html = buildHtml(form, subtotal, discountAmt, taxAmt, total)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, "_blank")
    w?.addEventListener("load", () => {
      setTimeout(() => {
        w.print()
        URL.revokeObjectURL(url)
        if (!printedRef.current) {
          printedRef.current = true
          setDownloaded(true)
          announceToScreenReader("Invoice opened in new tab for printing")
          setTimeout(() => { setDownloaded(false); printedRef.current = false }, 2000)
        }
      }, 300)
    })
  }, [form, subtotal, discountAmt, taxAmt, total])

  const reset = useCallback(() => {
    if (confirm("Clear all invoice data?")) {
      setForm(DEFAULT)
      announceToScreenReader("Invoice data cleared")
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        printInvoice()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [printInvoice, reset])

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Invoice Generator</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reset()}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          aria-label="Clear all invoice data"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />Clear
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Invoice Generator"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "P"], description: "Print / Preview invoice" },
              { keys: ["Ctrl", "Shift", "X"], description: "Reset form" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
          <Button
            size="sm"
            variant={downloaded ? "outline" : "default"}
            onClick={() => printInvoice()}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={downloaded ? "Invoice ready for printing" : "Print or download invoice as PDF"}
          >
            {downloaded ? <FileCheck className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> : <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
            {downloaded ? "Ready!" : "Download / Print"}
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${downloaded ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+P</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Invoice Generator</h2>
          <ShortcutsModal
            pageName="Invoice Generator"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "P"], description: "Print / Preview invoice" },
              { keys: ["Ctrl", "Shift", "X"], description: "Reset form" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Form
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left — Form */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="form-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="form-panel-label">Invoice Details</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5" role="form" aria-label="Invoice form">

              {/* From */}
              <div className="space-y-2" role="group" aria-labelledby="from-label">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="from-label">From (Your Business)</p>

                {/* Logo upload */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Logo (optional)</Label>
                  {form.logoDataUrl ? (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
                      <img src={form.logoDataUrl} alt="Logo preview" className="h-8 w-auto max-w-[120px] object-contain" />
                      <button
                        onClick={() => { set("logoDataUrl", ""); announceToScreenReader("Logo removed") }}
                        className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        aria-label="Remove logo"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 h-8 cursor-pointer rounded-md border border-dashed border-border bg-muted/20 px-3 text-xs text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Click to upload logo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            set("logoDataUrl", ev.target?.result as string)
                            announceToScreenReader("Logo uploaded")
                          }
                          reader.readAsDataURL(file)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  )}
                </div>

                <Field label="Business / Your Name" value={form.fromName} onChange={v => { set("fromName", v); announceToScreenReader("Business name updated") }} placeholder="Acme Corp" />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor="from-address">Address</Label>
                  <Textarea id="from-address" value={form.fromAddress} onChange={e => { set("fromAddress", e.target.value); announceToScreenReader("From address updated") }} placeholder={"123 Main St\nCity, State ZIP\nCountry"} rows={3} className="text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email" value={form.fromEmail} onChange={v => { set("fromEmail", v); announceToScreenReader("From email updated") }} placeholder="hello@acme.com" />
                  <Field label="Phone" value={form.fromPhone} onChange={v => { set("fromPhone", v); announceToScreenReader("From phone updated") }} placeholder="+1 555-0100" />
                </div>
              </div>

              {/* To */}
              <div className="space-y-2" role="group" aria-labelledby="to-label">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="to-label">Bill To (Client)</p>
                <Field label="Client Name / Company" value={form.toName} onChange={v => { set("toName", v); announceToScreenReader("Client name updated") }} placeholder="Client Name" />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor="to-address">Address</Label>
                  <Textarea id="to-address" value={form.toAddress} onChange={e => { set("toAddress", e.target.value); announceToScreenReader("Client address updated") }} placeholder={"456 Client Ave\nCity, State ZIP"} rows={2} className="text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
                </div>
                <Field label="Client Email" value={form.toEmail} onChange={v => { set("toEmail", v); announceToScreenReader("Client email updated") }} placeholder="client@example.com" />
              </div>

              {/* Invoice details */}
              <div className="space-y-2" role="group" aria-labelledby="invoice-details-label">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="invoice-details-label">Invoice Details</p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Invoice #" value={form.invoiceNum} onChange={v => { set("invoiceNum", v); announceToScreenReader(`Invoice number ${v}`) }} />
                  <Field label="Date" value={form.date} onChange={v => { set("date", v); announceToScreenReader(`Invoice date set to ${v}`) }} type="date" />
                  <Field label="Due Date" value={form.dueDate} onChange={v => { set("dueDate", v); announceToScreenReader(`Due date set to ${v}`) }} type="date" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground" htmlFor="currency-select">Currency</Label>
                    <select
                      id="currency-select"
                      value={form.currency}
                      onChange={e => { set("currency", e.target.value); announceToScreenReader(`${e.target.value} currency selected`) }}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label="Select currency"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <Field label="Tax Rate (%)" value={form.taxRate} onChange={v => { set("taxRate", v); announceToScreenReader(`Tax rate ${v} percent`) }} placeholder="0" type="number" />
                </div>

                {/* Discount */}
                <div className="space-y-1" role="group" aria-label="Discount settings">
                  <Label className="text-xs text-muted-foreground">Discount</Label>
                  <div className="flex gap-1.5">
                    <select
                      value={form.discountType}
                      onChange={e => { set("discountType", e.target.value as "%" | "flat"); announceToScreenReader(`Discount type changed to ${e.target.value}`) }}
                      className="h-8 w-16 shrink-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label="Discount type"
                    >
                      <option value="%">%</option>
                      <option value="flat">Flat</option>
                    </select>
                    <Input
                      type="number"
                      value={form.discountValue}
                      onChange={e => { set("discountValue", e.target.value); announceToScreenReader(`Discount ${e.target.value} ${form.discountType}`) }}
                      placeholder="0"
                      min="0"
                      step={form.discountType === "%" ? "1" : "0.01"}
                      className="h-8 text-sm flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`Discount value in ${form.discountType === "%" ? "percent" : "flat amount"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2" role="group" aria-labelledby="line-items-label">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="line-items-label">Line Items</p>
                <div className="space-y-2" role="list" aria-label="Invoice line items">
                  {form.items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-[1fr_60px_80px_32px] gap-1.5 items-start" role="listitem" aria-label={`Item ${idx + 1}: ${item.description || "Empty"}`}>
                      <div className="space-y-0.5">
                        {idx === 0 && <Label className="text-xs text-muted-foreground" htmlFor={`desc-${item.id}`}>Description</Label>}
                        <Input id={`desc-${item.id}`} value={item.description} onChange={e => { updateItem(item.id, "description", e.target.value); announceToScreenReader("Item description updated") }} placeholder="Service or product" className="h-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
                      </div>
                      <div className="space-y-0.5">
                        {idx === 0 && <Label className="text-xs text-muted-foreground" htmlFor={`qty-${item.id}`}>Qty</Label>}
                        <Input id={`qty-${item.id}`} type="number" value={item.qty} onChange={e => { updateItem(item.id, "qty", e.target.value); announceToScreenReader(`Quantity ${e.target.value}`) }} className="h-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" min="0" />
                      </div>
                      <div className="space-y-0.5">
                        {idx === 0 && <Label className="text-xs text-muted-foreground" htmlFor={`price-${item.id}`}>Unit Price</Label>}
                        <Input id={`price-${item.id}`} type="number" value={item.price} onChange={e => { updateItem(item.id, "price", e.target.value); announceToScreenReader(`Unit price ${e.target.value}`) }} placeholder="0.00" className="h-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" min="0" step="0.01" />
                      </div>
                      <div className={idx === 0 ? "pt-5" : ""}>
                        <button
                          onClick={() => { removeItem(item.id); announceToScreenReader("Line item removed") }}
                          className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                          aria-label={`Remove ${item.description || "item " + (idx + 1)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { addItem(); announceToScreenReader("New line item added") }}
                  className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Add new line item"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />Add Line Item
                </Button>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground" htmlFor="notes-input">Notes / Payment Terms</Label>
                <Textarea
                  id="notes-input"
                  value={form.notes}
                  onChange={e => { set("notes", e.target.value); announceToScreenReader("Notes updated") }}
                  placeholder="Payment due within 30 days. Thank you for your business!"
                  rows={3}
                  className="text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Invoice notes"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Preview */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="preview-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="preview-panel-label">Preview</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { set("isPaid", !form.isPaid); announceToScreenReader(form.isPaid ? "Invoice marked as unpaid" : "Invoice marked as paid") }}
                aria-pressed={form.isPaid}
                aria-label={form.isPaid ? "Mark as unpaid" : "Mark as paid"}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  form.isPaid
                    ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {form.isPaid ? "Paid" : "Mark as Paid"}
              </button>
              <span className="text-xs text-muted-foreground" aria-live="polite">Auto-saved</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div
              className="relative bg-white dark:bg-card rounded-xl border border-border shadow-sm p-6 md:p-8 font-sans text-sm text-foreground overflow-hidden"
              role="img"
              aria-label={`Invoice preview: ${form.fromName || "Your Business"} to ${form.toName || "Client"}. Invoice number ${form.invoiceNum}. Total: ${fmt(total, currency)}${form.isPaid ? ". Marked as paid." : ""}`}
            >
              {/* PAID stamp */}
              {form.isPaid && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                  <div className="rotate-[-25deg] text-green-600 dark:text-green-500 opacity-20 border-[5px] border-current rounded-xl px-8 py-3 text-4xl font-black tracking-widest select-none">
                    PAID
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  {form.logoDataUrl && (
                    <img src={form.logoDataUrl} alt="Business logo" className="h-12 w-auto max-w-[160px] object-contain mb-2" />
                  )}
                  <p className="text-lg font-bold">{form.fromName || "Your Business"}</p>
                  <p className="text-muted-foreground text-xs whitespace-pre-line mt-1">{form.fromAddress}</p>
                  {form.fromEmail && <p className="text-xs text-muted-foreground">{form.fromEmail}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary">INVOICE</p>
                  <p className="text-xs text-muted-foreground mt-1"># {form.invoiceNum}</p>
                  <p className="text-xs text-muted-foreground">Date: {form.date}</p>
                  <p className="text-xs text-muted-foreground">Due: {form.dueDate}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Bill To</p>
                <p className="font-semibold">{form.toName || "—"}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{form.toAddress}</p>
                {form.toEmail && <p className="text-xs text-muted-foreground">{form.toEmail}</p>}
              </div>

              {/* Table */}
              <table className="w-full text-xs mb-4" aria-label="Line items table">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-2 text-muted-foreground font-semibold uppercase tracking-wide" scope="col">Description</th>
                    <th className="text-center py-2 text-muted-foreground font-semibold uppercase tracking-wide w-12" scope="col">Qty</th>
                    <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide w-20" scope="col">Price</th>
                    <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide w-20" scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map(item => {
                    const qty = parseFloat(item.qty) || 0, price = parseFloat(item.price) || 0
                    return (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-2">{item.description || <span className="text-muted-foreground italic">—</span>}</td>
                        <td className="py-2 text-center text-muted-foreground">{qty}</td>
                        <td className="py-2 text-right text-muted-foreground">{fmt(price, currency)}</td>
                        <td className="py-2 text-right">{fmt(qty * price, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex flex-col items-end gap-1 mb-4 text-xs" aria-label="Invoice totals">
                <div className="flex justify-between w-44"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal, currency)}</span></div>
                {discountAmt > 0 && (
                  <div className="flex justify-between w-44">
                    <span className="text-muted-foreground">
                      {form.discountType === "%" ? `Discount (${form.discountValue}%)` : "Discount"}
                    </span>
                    <span className="text-green-600 dark:text-green-400">-{fmt(discountAmt, currency)}</span>
                  </div>
                )}
                {parseFloat(form.taxRate) > 0 && (
                  <div className="flex justify-between w-44"><span className="text-muted-foreground">Tax ({form.taxRate}%)</span><span>{fmt(taxAmt, currency)}</span></div>
                )}
                <div className="flex justify-between w-44 pt-1.5 border-t-2 border-primary font-bold text-primary text-sm" role="status" aria-live="polite">
                  <span>Total</span><span>{fmt(total, currency)}</span>
                </div>
              </div>

              {form.notes && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-muted-foreground">{form.notes}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Fill in <span className="text-foreground font-medium">From</span> (your business) and <span className="text-foreground font-medium">Bill To</span> (your client) details on the left. Upload a logo to appear at the top of the invoice.</li>
                <li>Set the invoice number, dates, currency, tax rate, and optional discount.</li>
                <li>Add line items with a description, quantity, and unit price. The amount calculates automatically.</li>
                <li>Click <span className="text-foreground font-medium">Mark as Paid</span> in the preview header to add a PAID stamp to the invoice.</li>
                <li>Click <span className="text-foreground font-medium">Download / Print</span> or press <span className="text-foreground font-medium">Ctrl+Shift+P</span>, then choose <span className="text-foreground font-medium">Save as PDF</span> in the print dialog.</li>
              </ol>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tips</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>Your data saves automatically as you type. It will still be here when you return.</li>
                  <li>Discount can be a percentage of the subtotal or a flat amount. Tax is applied after the discount.</li>
                  <li>Use <span className="text-foreground font-medium">Ctrl+Shift+X</span> to clear all fields and start a fresh invoice.</li>
                  <li>Everything runs in your browser. Nothing is sent to a server.</li>
                </ul>
              </div>
            </div>
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reset()}
          className="h-11 px-3"
          aria-label="Clear all invoice data"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
        <button
          onClick={() => { set("isPaid", !form.isPaid); announceToScreenReader(form.isPaid ? "Invoice marked as unpaid" : "Invoice marked as paid") }}
          aria-pressed={form.isPaid}
          aria-label={form.isPaid ? "Mark as unpaid" : "Mark as paid"}
          className={`h-11 flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            form.isPaid
              ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
              : "border-border bg-muted/30 text-muted-foreground"
          }`}
        >
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          {form.isPaid ? "Paid" : "Paid?"}
        </button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={downloaded ? "outline" : "default"}
          className="h-11 px-4"
          onClick={() => printInvoice()}
          aria-label={downloaded ? "Invoice ready for printing" : "Print or download invoice as PDF"}
        >
          {downloaded ? <FileCheck className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {downloaded ? "Ready!" : "Download / Print"}
        </Button>
      </div>
    </div>
  )
}
