import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://eix-property-score-beta.vercel.app'),
  title: 'EiX Property Score™ — AI Property Investment Score for SA Property',
  description:
    'Paste any Property24 listing. Know if it is worth buying within 24 hours. AI-powered investment scoring, rental yield analysis and risk assessment.',
  openGraph: {
    title: 'EiX Property Score™',
    description:
      'Paste any property listing. Know if it is worth buying within 24 hours. AI-powered investment scoring for South African real estate.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-midnight text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
