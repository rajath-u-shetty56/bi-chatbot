import "@/app/(preview)/globals.css";
import { Metadata } from "next";
import { Toaster } from "sonner";
import { AI } from "@/app/(preview)/actions";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: 'CSV Analysis',
  description: 'Analyze your CSV data with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" richColors />
        <AI>{children}</AI>
      </body>
    </html>
  )
}
