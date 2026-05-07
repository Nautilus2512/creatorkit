import PdfToImage from "@/components/tools/pdf-to-image"
import { Metadata } from "next"
export const metadata: Metadata = { title: "PDF to Image - CreatorKit", description: "Convert PDF pages to PNG images. Adjust resolution and download as ZIP. Runs entirely in your browser." }
export default function Page() { return <PdfToImage /> }
