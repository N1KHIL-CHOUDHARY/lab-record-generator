import type { Metadata } from 'next';
import { Josefin_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

const josefinSans = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://labora.nikhil-dev.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Lab Record Generator | Saveetha Engineering College Format',
    template: '%s | Lab Record Generator',
  },
  description:
    'Fast, client-side lab record generator tailored for Saveetha Engineering College and Anna University formats. Auto-number experiments, embed QR codes, and export standardized PDFs/DOCXs instantly.',
  keywords: [
    'lab record generator',
    'record generator',
    'saveetha lab records',
    'saveetha engineering college lab record',
    'lab record pdf generator',
    'qr code lab record',
    'anna university lab record',
    'table of contents generator',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Lab Record Generator | Saveetha Engineering College Format',
    description:
      'Fast, client-side lab record generator tailored for Saveetha Engineering College and Anna University formats. Auto-number experiments, embed QR codes, and export standardized PDFs/DOCXs instantly.',
    url: siteUrl,
    siteName: 'Labora - Saveetha Lab Record Generator',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/images/college-logo.png',
        width: 800,
        height: 600,
        alt: 'Saveetha Engineering College Autonomous Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lab Record Generator | Saveetha Engineering College Format',
    description:
      'Fast, client-side lab record generator tailored for Saveetha Engineering College and Anna University formats.',
    images: ['/images/college-logo.png'],
  },
  icons: {
    icon: [
      { url: '/images/college-logo.png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/images/college-logo.png',
  },
};

const jsonLdWebApplication = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Saveetha Lab Record Generator',
  url: siteUrl,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'All',
  description:
    'Client-side tool to build formatted Saveetha Engineering College lab records with automatic experiment numbering, instant QR codes, and PDF/DOCX downloads.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  featureList: [
    'Saveetha Engineering College Table of Contents Format',
    'Client-Side QR Code Generation',
    'Automatic Experiment Numbering',
    '1-Click PDF and DOCX Exports',
    'Permanent GitHub Solution Linking',
  ],
};

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does the Saveetha lab record generator work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It allows students to input experiment details, automatically generates dynamic QR codes linked to their code or repository, formats the table of contents strictly matching Saveetha Engineering College requirements, and exports to PDF or DOCX format client-side.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it support the official Saveetha Engineering College Table of Contents format?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, it is designed specifically around the Saveetha Engineering College autonomous lab record layout, including Experiment Number, Date, Name of the Experiment, QR Code for source verification, Marks, and Staff Signature columns.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is the QR code generated client-side?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, all QR codes and document previews are generated 100% client-side in your browser for instant privacy and speed.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I export records to both PDF and DOCX formats?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, you can export your completed lab record table of contents directly to PDF and Microsoft Word DOCX formats with a single click.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it support Anna University lab record formats as well?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, the generated table and document structure follow standardized engineering laboratory format guidelines recognized across Anna University affiliated and autonomous engineering institutions.',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${josefinSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApplication) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      </head>
      <body className={`${josefinSans.className} min-h-full flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-150`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
