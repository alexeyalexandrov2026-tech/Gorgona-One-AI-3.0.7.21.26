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
import DiscoveryDock from './components/ai/DiscoveryDock';    
import { AiDockProvider } from './components/ai/AiDockProvider';
import { ChatProvider } from './components/ai/ChatProvider';
import { AiSphere } from './components/ai/AiSphere';         
import { AiDock } from './components/ai/AiDock';             
import { InstallPrompt } from './components/InstallPrompt';   

const baseUrl = 'https://gorgona-one.com';

// Site content is served from a single URL per page (language is chosen via
// cookie/localStorage, not a URL prefix), so every hreflang variant points
// at the same canonical URL - a valid pattern for search engines when
// language is determined client-side rather than through distinct routes.
const HREFLANG_CODES = ['en-US', 'ru', 'es', 'he-IL', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

export const metadata = {
  title: 'MIAMI ELIO | Yachts, villas, cars, events and shopping in Miami',
  description: 'Yachts, villas, cars, events and shopping in Miami, with one AI concierge in your language.',
  keywords: ['Miami', 'yacht charters', 'car rentals', 'villas', 'events', 'AI concierge'],
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
    languages: {
      ...Object.fromEntries(HREFLANG_CODES.map((code) => [code, baseUrl])),
      'x-default': baseUrl
    }
  },
  openGraph: {
    title: 'MIAMI ELIO',
    description: 'Yachts, villas, cars, tickets and an AI concierge in Miami.',
    url: 'https://gorgona-one.com',
    siteName: 'MIAMI ELIO',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MIAMI ELIO',
    description: 'Yachts, villas, cars, tickets and an AI concierge in Miami.'
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
      <body className="min-h-screen bg-g1-paper font-sans text-zinc-100 antialiased">
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
                      <DiscoveryDock />
                      <AiSphere />
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
        <AnalyticsBeacon token={process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN} />
      </body>
    </html>
  );
}
