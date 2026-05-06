import CssMinifier from "@/components/tools/css-minifier"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "CSS Minifier - CreatorKit",
  description: "Remove whitespace and comments from CSS files. See size savings instantly. Runs entirely in your browser.",
}

export default function CssMinifierPage() {
  return <CssMinifier />
}
