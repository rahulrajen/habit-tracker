'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchInterval: 15000, // 15s polling interval per spec (Section 3)
            refetchOnWindowFocus: true,
            staleTime: 10000,
          },
        },
      })
  );

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-dark text-gray-100">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </body>
    </html>
  );
}