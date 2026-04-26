import Link from "next/link"

const sections = [
  {
    title: "Acceptance of terms",
    body: "By accessing or using CreatorKit, you agree to these Terms of Service. If you do not agree, please do not use the service.",
  },
  {
    title: "Description of service",
    body: "CreatorKit provides browser-based creative utilities, including metadata removal, image resizing, and design token generation.",
  },
  {
    title: "Free vs Pro tier usage",
    body: "CreatorKit may offer free and Pro tiers. Free features are available as-is, while Pro features may include limits, billing terms, or additional capabilities described at purchase.",
  },
  {
    title: "Prohibited uses",
    body: "You agree not to misuse the service, interfere with platform operation, violate laws, or use CreatorKit for harmful, fraudulent, or abusive activities.",
  },
  {
    title: "Disclaimer of warranties",
    body: "CreatorKit is provided on an 'as is' and 'as available' basis without warranties of any kind, express or implied.",
  },
  {
    title: "Limitation of liability",
    body: "To the fullest extent permitted by law, CreatorKit and its operators are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service.",
  },
  {
    title: "Contact information",
    body: "Questions about these terms can be sent to creatorkit.hello@gmail.com.",
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 space-y-4">
          <p className="inline-flex rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            CreatorKit Terms
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Please review these terms before using CreatorKit tools.
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
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
