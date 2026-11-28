import './fonts.css';
import './globals.css';
import './design-system.css';
import './ai-overlays.css';                              
import { AnalyticsBeacon } from './components/AnalyticsBeacon';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LocaleProvider } from './components/LocaleProvider';
import { AuthProvider } from './components/AuthProvider';
import { FavoritesProvider } from './components/FavoritesProvider';
import { ThemeProvider } from './components/ThemeProvider';    
import { AIProvider } from './components/ai/AIProvider';      
import { AiDockProvider } from './components/ai/AiDockProvider';
import { ChatProvider } from './components/ai/ChatProvider';
import { AiSphere } from './components/ai/AiSphere';         
import ManagerTelegramButton from './components/ai/ManagerTelegramButton';
import ManagerWhatsAppButton from './components/ai/ManagerWhatsAppButton';
import { AiDock } from './components/ai/AiDock';             
import { InstallPrompt } from './components/InstallPrompt';
import { ServiceWorkerRegister } from './components/ServiceWorkerRegister';
import { DEFAULT_IMAGE } from '../lib/seo.mjs';

const baseUrl = 'https://gorgona-one.com';

// Every language shares one address per page (the language is a cookie, not
// a URL prefix), so there are no hreflang alternates. './' resolves against
// the current page, so a page without its own metadata still names itself as
// canonical instead of claiming to be a copy of the home page.
export const metadata = {
  title: 'MIAMI ELIO | Yachts, villas, cars, events and dining in Miami',
  description: 'Yachts, villas, cars, events and dining in Miami, with ELIO+ Guide in your language.',
  keywords: ['Miami', 'yacht charters', 'car rentals', 'villas', 'events', 'dining', 'ELIO+ Guide'],
  metadataBase: new URL(baseUrl),
  alternates: { canonical: './' },
  // The "ME" monogram already in public/: the tab and search results only
  // show it when the page links it.
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'MIAMI ELIO',
    description: 'Yachts, villas, cars, tickets and ELIO+ Guide in Miami.',
    url: './',
    siteName: 'MIAMI ELIO',
    images: [DEFAULT_IMAGE],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MIAMI ELIO',
    description: 'Yachts, villas, cars, tickets and ELIO+ Guide in Miami.',
    images: [DEFAULT_IMAGE.url]
  },
  verification: {
    other: {
      verification: 'c64feafe15fa67c649d4f21448b3438a'
    }
  }
};

export default function RootLayout({ children }) {
  return (
    // Dark palette until every page is on the new design system.
    <html lang="en" data-theme="dark" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://media.gorgona-one.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://media.gorgona-one.com" />
        <link rel="alternate" type="text/markdown" href="/llms.txt" />
        <link rel="alternate" type="text/markdown" href="/llms-full.txt" />
      </head>
      <body className="min-h-screen font-sans text-zinc-100 antialiased">
        <LocaleProvider>
          <AuthProvider>
            <FavoritesProvider>
            <ThemeProvider>
              <AIProvider>
                <AiDockProvider>
                  {/* One concierge thread for every surface (homepage bar,
                      sphere dock, Discovery Room). Mounted above the router
                      so the conversation survives client-side navigation -
                      including a tap on one of the concierge's own cards. */}
                  <ChatProvider>
                    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
                      <Header />
                      {children}
                      <Footer />
                      <AiSphere />
                      <ManagerTelegramButton />
                      <ManagerWhatsAppButton />
                      <AiDock />
                      <InstallPrompt />
                    </div>
                  </ChatProvider>
                </AiDockProvider>
              </AIProvider>
            </ThemeProvider>
            </FavoritesProvider>
          </AuthProvider>
        </LocaleProvider>
        <ServiceWorkerRegister />
        <AnalyticsBeacon token={process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN} />
      </body>
    </html>
  );
}
