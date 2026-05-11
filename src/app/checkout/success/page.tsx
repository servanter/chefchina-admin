'use client';

import { useEffect } from 'react';

export default function CheckoutSuccessPage() {
  useEffect(() => {
    // 5 秒后尝试关闭窗口（适用于 WebView）
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch (e) {
        // 如果无法关闭（桌面浏览器），则忽略
        console.log('Cannot close window automatically');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>✅</div>
        <h1 style={styles.title}>支付成功！</h1>
        <p style={styles.message}>
          感谢您的订阅。请返回 App 查看您的会员状态。
        </p>
        <p style={styles.hint}>
          （本窗口将在 5 秒后自动关闭）
        </p>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '24px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px',
  },
  icon: {
    fontSize: '80px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  hint: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic',
  },
};
