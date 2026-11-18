import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';

export const metadata: Metadata = {
  title: 'EduSync — Cloud Assignment & Evaluation Platform',
  description: 'Next-generation educational platform connecting teachers and students with Neon PostgreSQL and local file storage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-bg text-slate-text">
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
