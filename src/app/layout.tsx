import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: "Let's Get Hired — Devanshi",
  description: 'Dublin job hunt command centre — Trust & Safety, AI Analyst, Data Analyst, Product Owner',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
