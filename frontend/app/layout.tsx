import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AuthProviderSecure } from '@/components/auth-provider-secure'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Trading Assistant',
  description: 'Your personal AI-powered cryptocurrency trading assistant',
  keywords: ['cryptocurrency', 'trading', 'AI', 'assistant', 'blockchain'],
  authors: [{ name: 'AI Trading Assistant Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProviderSecure>
            <div className="relative min-h-screen bg-background">
              {children}
            </div>
            <Toaster />
          </AuthProviderSecure>
        </ThemeProvider>
      </body>
    </html>
  )
}