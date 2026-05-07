import VideoThumbnailExtractor from "@/components/tools/video-thumbnail-extractor"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Video Thumbnail Extractor - CreatorKit", description: "Extract frames from video files as JPG images. Download individually or as a ZIP. Runs entirely in your browser." }
export default function Page() { return <VideoThumbnailExtractor /> }
