"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Trash2, Download, RotateCcw, FileCheck } from "lucide-react"
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
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

interface LineItem { id: string; description: string; qty: string; price: string }
interface Form {
  fromName: string; fromAddress: string; fromEmail: string; fromPhone: string
  toName: string; toAddress: string; toEmail: string
  invoiceNum: string; date: string; dueDate: string
  currency: string; taxRate: string; notes: string
  items: LineItem[]
}

const DEFAULT: Form = {
  fromName: "", fromAddress: "", fromEmail: "", fromPhone: "",
  toName: "", toAddress: "", toEmail: "",
  invoiceNum: "INV-001",
  date: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  currency: "USD", taxRate: "0", notes: "",
  items: [{ id: "1", description: "", qty: "1", price: "" }],
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "MYR", "SGD", "INR"]

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(isNaN(n) ? 0 : n)
}

function buildHtml(f: Form, sub: number, tax: number, total: number) {
  const currency = f.currency
  const rows = f.items.filter(i => i.description).map(i => {
    const qty = parseFloat(i.qty) || 0, price = parseFloat(i.price) || 0
    return `<tr><td>${i.description}</td><td style="text-align:center">${qty}</td><td style="text-align:right">${fmt(price,currency)}</td><td style="text-align:right">${fmt(qty*price,currency)}</td></tr>`
  }).join("")
  const taxRate = parseFloat(f.taxRate) || 0
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${f.invoiceNum}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;padding:48px;font-size:14px;line-height:1.6}
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
@media print{body{padding:0}@page{margin:20mm}}
</style></head><body>
<div class="header">
  <div><div class="from-name">${f.fromName||"Your Business"}</div><div style="color:#555;white-space:pre-line">${f.fromAddress}</div>${f.fromEmail?`<div>${f.fromEmail}</div>`:""} ${f.fromPhone?`<div>${f.fromPhone}</div>`:""}</div>
  <div class="meta-right"><div class="inv-title">INVOICE</div><div class="inv-meta"><b>#${f.invoiceNum}</b><br>Date: ${f.date}<br>Due: ${f.dueDate}</div></div>
</div>
<div class="parties">
  <div><div class="section-label">Bill From</div><b>${f.fromName||"-"}</b><br><span style="white-space:pre-line;color:#555">${f.fromAddress}</span></div>
  <div><div class="section-label">Bill To</div><b>${f.toName||"-"}</b><br><span style="white-space:pre-line;color:#555">${f.toAddress}</span>${f.toEmail?`<br>${f.toEmail}`:""}</div>
</div>
<table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
  <div class="total-row"><span class="total-label">Subtotal</span><span class="total-value">${fmt(sub,currency)}</span></div>
  ${taxRate>0?`<div class="total-row"><span class="total-label">Tax (${taxRate}%)</span><span class="total-value">${fmt(tax,currency)}</span></div>`:""}
  <div class="total-row grand"><span>Total</span><span>${fmt(total,currency)}</span></div>
</div>
${f.notes?`<div class="notes"><div class="section-label">Notes</div><p>${f.notes}</p></div>`:""}
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
  const printedRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem("ck-invoice")
    if (saved) try { setForm(JSON.parse(saved)) } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem("ck-invoice", JSON.stringify(form))
  }, [form])

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v })), [])

  const addItem = () => set("items", [...form.items, { id: Date.now().toString(), description: "", qty: "1", price: "" }])
  const removeItem = (id: string) => set("items", form.items.filter(i => i.id !== id))
  const updateItem = (id: string, k: keyof LineItem, v: string) =>
    set("items", form.items.map(i => i.id === id ? { ...i, [k]: v } : i))

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0)
  const taxAmt   = subtotal * (parseFloat(form.taxRate) || 0) / 100
  const total    = subtotal + taxAmt
  const currency = form.currency

  const printInvoice = useCallback(() => {
    const html = buildHtml(form, subtotal, taxAmt, total)
    const blob = new Blob([html], { type: "text/html" })
    const url  = URL.createObjectURL(blob)
    const w    = window.open(url, "_blank")
    w?.addEventListener("load", () => {
      setTimeout(() => { 
        w.print(); 
        URL.revokeObjectURL(url)
        if (!printedRef.current) {
          printedRef.current = true
          setDownloaded(true)
          announceToScreenReader("Invoice opened in new tab for printing")
          setTimeout(() => { setDownloaded(false); printedRef.current = false }, 2000)
        }
      }, 300)
    })
  }, [form, subtotal, taxAmt, total])

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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [printInvoice, reset])

  return (
    <>
      <ShortcutsModal
        pageName="Invoice Generator"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "P"], description: "Print / Preview invoice" },
          { keys: ["Ctrl", "Shift", "R"], description: "Reset form" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
      <div className="flex h-full flex-col gap-3 p-4" role="main" aria-label="Invoice Generator tool">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Invoice Generator</h2>
            <p className="text-muted-foreground">Create professional invoices. Saved locally — never uploaded. Press ? for shortcuts.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => reset()}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              aria-label="Clear all invoice data"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />Clear
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+R</kbd>
            </Button>
            <Button 
              size="sm" 
              onClick={() => printInvoice()}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={downloaded ? "Invoice ready for printing" : "Print or download invoice as PDF"}
            >
              {downloaded ? <FileCheck className="h-3.5 w-3.5 mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
              {downloaded ? "Ready!" : "Download / Print"}
              <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+P</kbd>
            </Button>
          </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Form */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="form-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="form-panel-label">Invoice Details</span>
          </div>
          <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-5" role="form" aria-label="Invoice form">

            {/* From */}
            <div className="space-y-2" role="group" aria-labelledby="from-label">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="from-label">From (Your Business)</p>
              <Field label="Business / Your Name" value={form.fromName} onChange={v => { set("fromName", v); announceToScreenReader("Business name updated") }} placeholder="Acme Corp" />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground" htmlFor="from-address">Address</Label>
                <Textarea id="from-address" value={form.fromAddress} onChange={e => { set("fromAddress", e.target.value); announceToScreenReader("From address updated") }} placeholder="123 Main St&#10;City, State ZIP&#10;Country" rows={3} className="text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
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
                <Textarea id="to-address" value={form.toAddress} onChange={e => { set("toAddress", e.target.value); announceToScreenReader("Client address updated") }} placeholder="456 Client Ave&#10;City, State ZIP" rows={2} className="text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
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
            </div>

            {/* Items */}
            <div className="space-y-2" role="group" aria-labelledby="line-items-label">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="line-items-label">Line Items</p>
              <div className="space-y-2" role="list" aria-label="Invoice line items">
                {form.items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[1fr_60px_80px_32px] gap-1.5 items-start" role="listitem" aria-label={`Item ${idx + 1}: ${item.description || 'Empty'}`}>
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
                        aria-label={`Remove ${item.description || 'item ' + (idx + 1)}`}
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
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="preview-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="preview-panel-label">Preview</span>
            <span className="text-xs text-muted-foreground" aria-live="polite">Auto-saved locally</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div 
              className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-6 md:p-8 font-sans text-sm text-foreground"
              role="img"
              aria-label={`Invoice preview: ${form.fromName || 'Your Business'} to ${form.toName || 'Client'}. Invoice number ${form.invoiceNum}. Total: ${fmt(total, currency)}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
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
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
