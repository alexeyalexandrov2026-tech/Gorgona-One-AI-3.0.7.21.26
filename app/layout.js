import './globals.css';
import './ai-overlays.css';                              
import Script from 'next/script';
import { Inter, Inter_Tight, Space_Mono, Fira_Mono, Playfair_Display } from 'next/font/google';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LocaleProvider } from './components/LocaleProvider';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/ThemeProvider';    
import { AIProvider } from './components/ai/AIProvider';      
import DiscoveryDock from './components/ai/DiscoveryDock';    
import { AiDockProvider } from './components/ai/AiDockProvider';
import { ChatProvider } from './components/ai/ChatProvider';
import { AiSphere } from './components/ai/AiSphere';         
import { AiDock } from './components/ai/AiDock';             
import { InstallPrompt } from './components/InstallPrompt';   

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap'
});
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono', display: 'swap' });
const firaMono = Fira_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-fira', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap'
});

const fontVariables = [inter, interTight, spaceMono, firaMono, playfair].map((f) => f.variable).join(' ');

const baseUrl = 'https://gorgona-one.com';

const description =
  'A luxury AI concierge for travel, dining, shopping, stays, yachts, cars, sportsbooks and events - plus verified promo codes and lifestyle deals.';

export const metadata = {
  title: 'GORGONA ONE | Luxury rentals, concierge and lifestyle deals',
  description,
  keywords: [
    'luxury concierge',
    'yacht charter',
    'exotic car rental',
    'villa rentals',
    'nightlife',
    'promo codes',
    'sportsbook promos',
    'event tickets'
  ],
  metadataBase: new URL(baseUrl),
  alternates: {
    // './' resolves against each page's own path, so every page is its own
    // canonical. A fixed URL here made every page declare the homepage as
    // its canonical. No hreflang alternates: all 16 languages share one URL
    // (the language is a cookie), so alternates pointing at the same URL
    // only confuse crawlers.
    canonical: './'
  },
  // og:image comes from app/opengraph-image.png (PNG - Facebook, X and
  // LinkedIn do not render SVG previews). No og:url: it would resolve to the
  // homepage for every page.
  openGraph: {
    title: 'GORGONA ONE',
    description,
    siteName: 'GORGONA ONE',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GORGONA ONE',
    description
  },
  icons: {
    apple: '/apple-touch-icon.png'
  },
  verification: {
    other: {
      verification: 'c64feafe15fa67c649d4f21448b3438a'
    }
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`scroll-smooth ${fontVariables}`}>
      <body className="min-h-screen bg-[#050505] font-sans text-zinc-100 antialiased">
        <LocaleProvider>
          <AuthProvider>
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
          </AuthProvider>
        </LocaleProvider>
        {process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
