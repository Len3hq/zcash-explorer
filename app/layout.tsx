import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import AgentChatWidget from '@/components/AgentChatWidget';
import Footer from '@/components/Footer';
import Preloader from '@/components/Preloader';

export const metadata: Metadata = {
  title: 'Zcash Explorer',
  description: 'A lightweight Zcash blockchain explorer with live stats and transaction views',
  icons: {
    icon: '/zcash-logo.png',
    shortcut: '/zcash-logo.png',
    apple: '/zcash-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="theme-zec">
        <Preloader />
        <Header />
        {children}
        <Footer />
        <AgentChatWidget />
      </body>
    </html>
  );
}
