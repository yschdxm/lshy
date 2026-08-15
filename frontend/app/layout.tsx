import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
// 自托管字体（npm 包内 woff2），构建无需访问 Google Fonts —— 国内服务器可直接构建
import '@fontsource-variable/noto-sans-sc'
import './globals.css'

export const metadata: Metadata = {
  title: '灵境云游 | 智慧景区服务平台',
  description: '智能导览、个性化推荐与贴心服务一站式体验',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#eaf3fb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="light">
      <body className="bg-background font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
