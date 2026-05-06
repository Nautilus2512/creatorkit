import RegexTester from "@/components/tools/regex-tester"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Regex Tester - CreatorKit",
  description: "Test and debug regular expressions with real-time matching and highlighting",
}

export default function RegexTesterPage() {
  return <RegexTester />
}