'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 登录页不需要验证
    if (pathname === '/login') {
      // 如果已登录，跳转到 dashboard
      if (isAuthenticated) {
        router.push('/dashboard');
      }
      return;
    }

    // 未登录则跳转到登录页
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router]);

  // 登录页直接显示，不包含管理后台布局
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // 未登录时显示加载中
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 已登录，显示完整内容
  return <>{children}</>;
}
