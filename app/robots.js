import { SITE_URL } from '../lib/seo.mjs';

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended'
];

// Sign-in and account screens carry noindex instead: a robots.txt block would
// hide that tag from crawlers. /api/mcp is explicitly allowed so AI assistants
// and agent clients can discover and invoke Miami Elio's public MCP endpoint.
export default function robots() {
  return {
    rules: [
      {
        userAgent: AI_CRAWLERS,
        allow: ['/', '/api/mcp'],
        disallow: ['/admin', '/api/']
      },
      {
        userAgent: '*',
        allow: ['/', '/api/mcp'],
        disallow: ['/admin', '/api/']
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
