import PdfOrganizer from "@/components/tools/pdf-organizer"
import { Metadata } from "next"
export const metadata: Metadata = { title: "PDF Organizer - CreatorKit", description: "Reorder and delete PDF pages with visual thumbnails. Runs entirely in your browser." }
export default function Page() { return <PdfOrganizer /> }
