import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { MobileHomeNav } from '@/components/mobile-home-nav';
import { PwaRegister } from '@/components/pwa-register';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://eix-property-score-beta.vercel.app'),
  title: 'EiX Property Score™ — AI Property Investment Score for SA Property',
  description:
    'Paste any Property24 listing. Know if it is worth buying within 24 hours. AI-powered investment scoring, rental yield analysis and risk assessment.',
  manifest: '/manifest.webmanifest',
  applicationName: 'EiX Property Score',
  appleWebApp: {
    capable: true,
    title: 'EiX Property Score',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/eixpropscorelogo.png',
    apple: '/eixpropscorelogo.png',
  },
  openGraph: {
    title: 'EiX Property Score™',
    description:
      'Paste any property listing. Know if it is worth buying within 24 hours. AI-powered property intelligence for South African real estate.',
    images: [{ url: '/eixpropscorelogo.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: '/eixpropscorelogo.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#00E5A8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-midnight text-white antialiased`}>
        <PwaRegister />
        {children}
        <MobileHomeNav />
      </body>
    </html>
  );
}
