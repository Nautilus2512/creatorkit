import Link from "next/link"
import { ShieldCheck } from "lucide-react"

const sections = [
  {
    title: "What data we collect",
    body: "CreatorKit does not collect personal files or image content. Our tools process data locally in your browser, so your uploaded files are not sent to our servers.",
  },
  {
    title: "How files are processed",
    body: "All image processing is 100% client-side. Metadata removal, resizing, and token generation run in your browser using local compute only.",
  },
  {
    title: "Cookies",
    body: "CreatorKit does not use cookies. Your theme preference (light or dark mode) is saved in your browser's local storage on your device only — this data never leaves your device.",
  },
  {
    title: "Analytics opt-out",
    body: "Vercel Web Analytics respects your browser's Do Not Track (DNT) setting. You can enable DNT in your browser settings to opt out of anonymous analytics collection.",
  },
  {
    title: "Age",
    body: "CreatorKit is intended for users aged 13 and older. Users under 18 should have parental permission to use this service.",
  },
  {
    title: "Third party services",
    body: "CreatorKit is hosted on Vercel. We use Vercel Web Analytics to monitor site performance. This service collects anonymized data only — page views, browser type, device type, and country. No personal files or identifiable information are collected. No third-party services process your files.",
  },
  {
    title: "Contact information",
    body: "Questions about privacy can be sent to creatorkit.hello@gmail.com.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 space-y-4">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="mr-2 h-3.5 w-3.5 text-green-600" />
            CreatorKit Privacy
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Your trust matters. CreatorKit is designed for browser-only processing and minimal data collection.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border bg-muted/20 p-5">
              <h2 className="text-lg font-medium">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row lg:px-8">
          <p>© 2026 CreatorKit</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
