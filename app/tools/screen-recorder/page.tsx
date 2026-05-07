import ScreenRecorder from "@/components/tools/screen-recorder"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Screen Recorder - CreatorKit", description: "Record your screen directly in the browser with optional audio. Download as WebM. Nothing is uploaded." }
export default function Page() { return <ScreenRecorder /> }
