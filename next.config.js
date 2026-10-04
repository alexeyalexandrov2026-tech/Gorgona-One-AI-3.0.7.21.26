/** @type {import('next').NextConfig} */

// Baseline security headers for every route. There is no script/style CSP
// yet: Next.js inline scripts would need per-request nonces first. What is
// here cannot break the site:
// - framing is refused (clickjacking), and so are <base>/<object> injection;
// - browsers must not MIME-sniff, and cross-site referrers carry the origin only;
// - pages may use the microphone (concierge voice input) and nothing else
//   sensitive;
// - HSTS without includeSubDomains/preload, so other subdomains are unaffected.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' }
];

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

module.exports = nextConfig;
