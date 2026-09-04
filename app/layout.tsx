import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EiX Property Score™ Beta | AI Investment Score for SA Property',
  description:
    'Paste any South African Property24 or Private Property listing and receive an AI Investment Score™, Rental Yield Estimate, BondMatch™ scenario and Risk Assessment.',
  openGraph: {
    title: 'EiX Property Score™ Beta',
    description:
      'Know if a property is worth buying before you make an offer. AI-powered property investment scoring for South African real estate.',
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
