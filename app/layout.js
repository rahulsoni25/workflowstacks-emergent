import './globals.css'

export const metadata = {
  title: 'ShowClawMart - AI Skills Marketplace',
  description: 'Discover Claude Skills, Gemini Extensions, and AI prompts from GitHub',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}