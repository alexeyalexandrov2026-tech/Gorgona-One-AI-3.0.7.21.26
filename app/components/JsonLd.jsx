import { serializeJsonLd } from '../../lib/seo.mjs';

// Structured data for search engines. Server component: nothing is added to
// the browser bundle. Pass one schema.org object or several.
export default function JsonLd({ data }) {
  return [].concat(data).filter(Boolean).map((entry, index) => (
    <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(entry) }} />
  ));
}
