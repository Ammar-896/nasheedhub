import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NasheedHub',
  description: 'Stream nasheeds from artists around the world',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}