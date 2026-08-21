import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';

export const metadata: Metadata = {
  metadataBase: new URL('https://maar.ai'),
  title: {
    default: 'MAAR AI — A private, local-first AI workspace',
    template: '%s · MAAR AI',
  },
  description:
    'MAAR AI is a premium, local-first AI workspace. Your conversations stay in your browser; NVIDIA NIM models power generation, streamed in real time.',
  applicationName: 'MAAR AI',
  authors: [{ name: 'Md Adil Rajon' }],
  creator: 'Md Adil Rajon',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    title: 'MAAR AI — A private, local-first AI workspace',
    description:
      'A premium AI workspace that keeps your conversations on your device. Powered by NVIDIA NIM models.',
    siteName: 'MAAR AI',
    url: 'https://maar.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAAR AI — A private, local-first AI workspace',
    description: 'A premium AI workspace that keeps your conversations on your device.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#05070A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="font-body antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
