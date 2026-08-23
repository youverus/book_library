import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Book Library · 在线书城',
  description: '轻量跨平台在线书城，支持多端同步阅读进度、书架与笔记',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#5b6cff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
          <NavBar />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400 safe-bottom">
          Book Library · youhxian.cn
        </footer>
      </body>
    </html>
  );
}
