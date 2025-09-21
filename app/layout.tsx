import './globals.css'
import SiteNav from '@/components/SiteNav'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SiteNav />
        <main className="mx-auto max-w-6xl p-6">
          {children}
        </main>
      </body>
    </html>
  )
}