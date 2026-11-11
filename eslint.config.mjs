import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  // Generated output, vendored apps and one-off scratch files are not ours to lint.
  { ignores: ['.next/**', '.open-next/**', 'node_modules/**', 'ai-router/**', 'new ia/**', 'public/**', 'playwright-report/**', 'test-results/**', 'prototypes/**', 'scratch/**'] },
  ...compat.extends('next/core-web-vitals').map((entry) => ({ ...entry, files: ['**/*.{js,jsx,mjs,cjs}'] })),
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    rules: {
      // The site runs on Cloudflare Workers without the next/image optimizer,
      // so photos are plain <img> elements by design.
      '@next/next/no-img-element': 'off'
    }
  },
  {
    // Saved translation catalogs and Worker entry points are a single
    // exported object by format, not by oversight.
    files: ['i18n/locales/**', 'workers/**'],
    rules: { 'import/no-anonymous-default-export': 'off' }
  }
];

export default config;
