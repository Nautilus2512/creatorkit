import BatchImageEditor from "@/components/tools/batch-image-editor"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Batch Image Editor - CreatorKit", description: "Apply edits to multiple images at once — resize, convert format, adjust brightness and contrast. Download as ZIP." }
export default function Page() { return <BatchImageEditor /> }
