'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 登录页不需要验证
    if (pathname === '/login') {
      return;
    }

    // 未登录则跳转
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router]);

  // 登录页直接显示
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

  return <>{children}</>;
}
