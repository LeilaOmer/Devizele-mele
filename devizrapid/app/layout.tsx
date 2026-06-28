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
        <meta name="google-site-verification" content="1oT_kVaquGCv5mRyuLehEXtvVb05ICwJ8ToNfDAqs84" />
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
      </body>
    </html>
  );
}