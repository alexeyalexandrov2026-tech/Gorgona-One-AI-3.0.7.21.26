# Self-hosted site fonts

The root layout imports `app/fonts.css`. Its font faces use the WOFF2 files
under `public/fonts`, so a Next.js build does not need to contact Google Fonts.
The CSS keeps the existing weights, styles, Unicode ranges, fallback metrics,
and CSS variable names. The browser requests the subsets used by the page.

The 64 WOFF2 files were copied byte for byte from the Next.js build of
`1ddd95fc` used for Cloudflare Worker version `ff1a7980`. That build obtained
them from Google Fonts. Each family includes its upstream SIL Open Font
License from the [Google Fonts repository][licenses]. Filenames retain the
content hashes assigned by Next.js.

When updating a family, retain its license and update the font files and the
corresponding face declarations together. Check the affected weights and
writing systems in the browser, then run the production build.

[licenses]: https://github.com/google/fonts/tree/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl
