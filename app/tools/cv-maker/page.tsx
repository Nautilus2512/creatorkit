import CvMaker from "@/components/tools/cv-maker"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "CV Maker - CreatorKit",
  description: "Build a professional CV or resume with live preview, two templates, and PDF export. Auto-saved. Runs entirely in your browser.",
}

export default function CvMakerPage() {
  return <CvMaker />
}
