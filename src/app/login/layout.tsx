import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import '../globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ChefChina Admin - 登录',
  description: '出海中国菜 — 管理后台登录',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
