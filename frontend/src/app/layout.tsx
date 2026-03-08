import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Finora â Smart Finance Dashboard',
  description:
    'Finora is a smart personal finance dashboard built for Indians. Track expenses, manage budgets, monitor investments, and gain insights tailored to Indian financial instruments like UPI, mutual funds, FDs, and more.',
  keywords: [
    'personal finance',
    'India',
    'budget tracker',
    'expense manager',
    'investment tracker',
    'UPI',
    'mutual funds',
    'financial dashboard',
  ],
  authors: [{ name: 'Finora' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#FAFAF7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body
        className={inter.className}
        style={{
          backgroundColor: '#FAFAF7',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            minHeight: '100vh',
            backgroundColor: '#FAFAF7',
          }}
        >
          {/* Sidebar â fixed width on the left */}
          <aside
            style={{
              width: '260px',
              minWidth: '260px',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflowY: 'auto',
            }}
          >
            <Sidebar />
          </aside>

          {/* Main content area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              overflowX: 'hidden',
            }}
          >
            {/* Header at the top of the main content */}
            <Header />

            {/* Page content */}
            <main
              style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto',
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
