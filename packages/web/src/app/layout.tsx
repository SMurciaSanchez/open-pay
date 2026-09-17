import './globals.css';
import { Inter, Poppins, JetBrains_Mono } from 'next/font/google';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata, Viewport } from 'next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'OpenPay | Finanzas Seguras',
  description: 'La plataforma financiera moderna que te da control total sobre tus finanzas personales.',
  keywords: 'fintech, pagos, transferencias, finanzas seguras',
  authors: [{ name: 'OpenPay' }],
  creator: 'OpenPay',
  robots: 'index, follow',
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
} 