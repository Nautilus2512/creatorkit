import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'CreatorKit — Privacy-First Browser Tools for Creators',
    template: '%s | CreatorKit',
  },
  description: 'Remove image metadata, resize photos for social media, and generate design tokens — all 100% in your browser. No uploads, no tracking, no account needed.',
  keywords: ['metadata remover', 'image resizer', 'design token generator', 'privacy tools', 'client-side tools', 'EXIF remover', 'social media image resize'],
  authors: [{ name: 'CreatorKit' }],
  creator: 'CreatorKit',
  metadataBase: new URL('https://creatorkit-murex.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://creatorkit-murex.vercel.app',
    title: 'CreatorKit — Privacy-First Browser Tools for Creators',
    description: 'Remove image metadata, resize photos for social media, and generate design tokens — all 100% in your browser. No uploads, no tracking.',
    siteName: 'CreatorKit',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CreatorKit — Privacy-First Browser Tools for Creators',
    description: 'Remove image metadata, resize photos for social media, and generate design tokens — 100% in your browser.',
    creator: '@creatorkit',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}