# Third-Party Licenses

CreatorKit uses the following open-source libraries. All are used under their permissive licenses.

| Library | License | Notes |
|---|---|---|
| exifr | MIT | EXIF metadata reading |
| pdf-lib | MIT | PDF metadata manipulation |
| jszip | MIT | Office document ZIP processing (MIT license selected, not GPL-3.0) |
| @ffmpeg/ffmpeg | MIT | Audio metadata removal via WebAssembly |
| @ffmpeg/util | MIT | FFmpeg WebAssembly utilities |
| music-metadata | MIT | Audio file metadata reading |
| next | MIT | React framework |
| react | MIT | UI library |
| tailwindcss | MIT | Utility-first CSS |
| next-themes | MIT | Dark/light theme |
| lucide-react | ISC | Icon library |
| @radix-ui/* | MIT | Accessible UI primitives |
| lamejs | LGPL-3.0 | MP3 encoding in audio-converter (used as unmodified library) |
| @img/sharp-win32-x64 | Apache-2.0 AND LGPL-3.0-or-later | Image processing binary (used as unmodified library) |
| imagequant | GPL-3.0 | PNG color quantization (transitive dependency of sharp; runs server-side only, not distributed to users) |

> jszip is dual-licensed (MIT OR GPL-3.0-or-later). CreatorKit uses it under the MIT license.
> lamejs and @img/sharp-win32-x64 are LGPL-licensed. CreatorKit uses them as unmodified libraries, which is permitted under LGPL without requiring source disclosure.
> imagequant is GPL-3.0 but is a transitive server-side dependency only. CreatorKit is a web service (SaaS); the GPL distribution clause does not apply as no binary is distributed to users.
