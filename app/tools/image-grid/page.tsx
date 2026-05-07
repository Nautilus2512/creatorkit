import ImageGrid from "@/components/tools/image-grid"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Image Grid / Collage - CreatorKit", description: "Arrange multiple images in a grid layout and export as a single PNG. Runs entirely in your browser." }
export default function Page() { return <ImageGrid /> }
