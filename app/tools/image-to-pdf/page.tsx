import ImageToPdf from "@/components/tools/image-to-pdf"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Image to PDF - CreatorKit", description: "Combine multiple images into a PDF document. Supports JPG, PNG, WebP. Runs entirely in your browser." }
export default function Page() { return <ImageToPdf /> }
