import './globals.css'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'ShowClawMart - AI Skills Marketplace',
  description: 'Discover Claude Skills, Gemini Extensions, and AI prompts from GitHub',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}