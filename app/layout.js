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

// Site content is served from a single URL per page (language is chosen via
// cookie/localStorage, not a URL prefix), so every hreflang variant points
// at the same canonical URL - a valid pattern for search engines when
// language is determined client-side rather than through distinct routes.
const HREFLANG_CODES = ['en-US', 'ru', 'es', 'he-IL', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

export const metadata = {
  title: 'GORGONA ONE | Global deals, promo codes, and lifestyle offers',
  description: 'Premium marketplace for shopping, restaurants, entertainment, travel, sports, and betting deals.',
  keywords: ['coupons', 'deals', 'discounts', 'sportsbook promos', 'travel offers', 'restaurant deals'],
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
    languages: {
      ...Object.fromEntries(HREFLANG_CODES.map((code) => [code, baseUrl])),
      'x-default': baseUrl
    }
  },
  openGraph: {
    title: 'GORGONA ONE',
    description: 'Discover verified promo codes, premium offers, and hidden deals across the globe.',
    url: 'https://gorgona-one.com',
    siteName: 'GORGONA ONE',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GORGONA ONE',
    description: 'Unlock hidden deals with verified coupons and premium offers.'
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
                  <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
                    <Header />
                    {children}
                    <Footer />
                    <DiscoveryDock />
                    <AiSphere />
                    <AiDock />
                    <InstallPrompt />
                  </div>
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
