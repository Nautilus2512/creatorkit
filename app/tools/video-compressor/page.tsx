import VideoCompressor from "@/components/tools/video-compressor"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Video Compressor - CreatorKit", description: "Compress videos using ffmpeg.wasm. Choose quality preset and download as MP4. Runs entirely in your browser." }
export default function Page() { return <VideoCompressor /> }
