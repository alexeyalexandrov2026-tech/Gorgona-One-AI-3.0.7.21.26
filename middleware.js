import { NextResponse } from 'next/server';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://privatejetfinder.com https://*.privatejetfinder.com",
  "style-src 'self' 'unsafe-inline' https://www.privatejetfinder.com https://*.privatejetfinder.com https://fonts.googleapis.com",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' https: blob: data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com https://static.cloudflareinsights.com https://privatejetfinder.com https://*.privatejetfinder.com",
  "frame-src 'self' https://yatr.co https://*.yatr.co https://www.stay22.com https://*.stay22.com https://widgets.bokun.io https://*.viator.com https://*.headout.com https://www.privatejetfinder.com https://*.privatejetfinder.com https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https:"
].join('; ');

const PRIVATE_PREFIXES = ['/admin', '/partner', '/login', '/register', '/profile', '/account', '/forgot-password', '/pay', '/trip', '/auth'];

export function middleware(request) {
  const response = NextResponse.next();
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), geolocation=(self), payment=(self "https://yatr.co" "https://checkout.stripe.com"), microphone=(self)');
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  const pathname = request.nextUrl?.pathname || '';
  if (PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|images/|fonts/|icons/|logos/|videos/|favicon-32\\.png|apple-touch-icon\\.png|miami-elio-turquoise-wave\\.jpg|og-image\\.|sw\\.js).*)'
  ]
};
