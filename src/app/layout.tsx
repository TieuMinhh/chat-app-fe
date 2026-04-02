import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'MessengerClone - Chat Realtime',
  description: 'Ứng dụng nhắn tin trực tuyến theo thời gian thực',
  icons: { icon: '/favicon.ico' },
};

import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <SocketProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '12px',
                    },
                  }}
                />
              </SocketProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
