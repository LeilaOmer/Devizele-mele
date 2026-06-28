import React from 'react'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import ActiveCompanyBanner from './components/ActiveCompanyBanner'
import CookieBanner from './components/CookieBanner'

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://devizele-mele.vercel.app'),
  title: {
    default: 'Tarifator – Răspunsul la „Cât costă?" | Fișă Servicii & Calculator Preț',
    template: '%s | Tarifator',
  },
  description: 'Răspunsul instant la „cât costă?" — fișă de servicii prin dictare vocală pentru prestatori (electricieni, instalatori, mecanici, coafori) și calculator preț cu adaos și TVA pentru comercianți. Gratuit 6 luni, fără card.',
  keywords: [
    // fise servicii — domenii
    'fisa servicii', 'fișă servicii', 'bon de lucru', 'bon manopera', 'raport de lucru',
    'electrician', 'instalator', 'instalatii sanitare', 'instalatii termice', 'instalatii gaz',
    'frigotehnist', 'aer conditionat', 'climatizare', 'HVAC', 'ventilatie', 'pompe de caldura',
    'zugrav', 'zugravit', 'zugravitor', 'vopsitor', 'faiantar', 'gresist', 'rigipsar',
    'tamplar', 'tamplarie', 'montaj ferestre', 'lacatus', 'sudor', 'acoperisuri', 'izolator',
    'mecanic auto', 'service auto', 'vopsitor auto', 'tinichigiu', 'electrician auto',
    'curatenie', 'curatenie birouri', 'spalatorie', 'dezinsectie', 'deratizare',
    'coafor', 'frizerie', 'manichiura', 'pedichiura', 'nail art', 'epilare', 'cosmetica',
    'masaj', 'maseur', 'kinetoterapie', 'fizioterapie', 'antrenor personal', 'nutriționist',
    'reparatii telefoane', 'reparatii calculatoare', 'service IT', 'mentenanta IT',
    'contabil', 'contabilitate', 'expert contabil', 'consultant fiscal', 'avocat',
    'meditatii', 'instructor auto', 'fotograf', 'cameraman', 'traducator', 'gradinărit',
    'prestator servicii', 'artizan', 'meserias', 'aplicatie meserias', 'aplicatie prestatori',
    // calculator pret — tipuri comercianti
    'calculator pret vanzare', 'calculator adaos comercial', 'calculator TVA', 'calculator marja profit',
    'calcul markup', 'calcul adaos', 'pret de vanzare',
    'magazin', 'boutique', 'grossist', 'angrosist', 'en-gros', 'importator', 'distribuitor',
    'producator', 'revanzator', 'reseller', 'dropshipping',
    'produse alimentare', 'non-alimentar', 'fashion', 'imbracaminte', 'cosmetice',
    'electronice', 'electrocasnice', 'materiale constructii', 'piese auto', 'bijuterii', 'mobilier',
    // general
    'Tarifator', 'Romania', 'TVA 11', 'TVA 21',
  ],
  authors: [{ name: 'Tarifator' }],
  creator: 'Tarifator',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: 'https://devizele-mele.vercel.app',
    siteName: 'Tarifator',
    title: 'Tarifator – Răspunsul la „Cât costă?"',
    description: '„Cât costă?" — răspunsul în secunde. Fișă servicii prin dictare vocală pentru prestatori + calculator preț cu adaos și TVA pentru comercianți. Gratuit 6 luni.',
  },
  twitter: {
    card: 'summary',
    title: 'Tarifator – Răspunsul la „Cât costă?"',
    description: 'Fișă servicii prin dictare + calculator preț cu adaos și TVA. Răspunsul instant la „cât costă?" pentru prestatori și comercianți. Gratuit 6 luni.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tarifator',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
          }
        `}} />
        <ActiveCompanyBanner />
        {children}
        <CookieBanner />
        <Link href="/quick"
          className="fixed bottom-24 right-4 z-[9999] w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-xl flex items-center justify-center"
          title="Fisa Servicii rapid prin dictare">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
          </svg>
        </Link>
      </body>
    </html>
  );
}