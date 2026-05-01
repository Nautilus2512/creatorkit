# CreatorKit Changelog

## v1.3.0 — May 2026
### New Tools
- **Image Compressor** — Compress JPEG, WebP, PNG images locally with quality control
- **Image Format Converter** — Convert between JPEG, PNG, WebP, AVIF client-side
- **Favicon Generator** — Generate all favicon sizes + site.webmanifest from image or text

## v1.2.0 — May 2026
### New Tools
- **Password Generator** — Cryptographically secure passwords with custom character sets
- **QR Code Generator** — QR codes for URL, text, email, phone, Wi-Fi — all offline

## v1.1.0 — May 2026
### Security
- Added HTTP security headers (CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy)
- Moved ffmpeg audio engine from CDN to local hosting — removed external dependency
- Switched audio processing to pure JS ID3 stripping for MP3 (no WASM, works on mobile)

### Legal
- Privacy Policy: disclosed Vercel Analytics, clarified cookies, added age section and analytics opt-out
- Terms of Service: added age requirement, copyright compliance, and governing law sections
- Added LICENSES.md documenting all open-source dependencies
- Added CHANGELOG.md and OWNERSHIP-NOTES.md for project documentation

### Improvements
- Mobile warning banner on Metadata Remover (tool is desktop-optimized)
- Loading progress UI for audio processor

## v1.0.0 — April 2026
### Launch
- Launched with 3 tools: Metadata Remover, Image Resizer, Design Token Generator
- Deployed at creatorkit-tools.vercel.app
- Google Search Console verified, sitemap submitted
