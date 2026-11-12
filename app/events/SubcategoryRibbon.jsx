import Link from 'next/link';
import { LocalizedText } from '../components/LocalizedText';

// The subcategories of one Events pillar as a slow running ribbon. Each chip
// opens that subcategory's page, which carries the live ticket calendar.
// The list is rendered twice so the loop has no seam; the second copy is
// hidden from assistive technology and from the tab order. The ribbon is
// named after its ticket's title, so the two on the page read differently.
export function SubcategoryRibbon({ categories, labelledBy }) {
  if (!categories.length) return null;

  const set = (copy) => (
    <ul className="ev-ribbon__set" aria-hidden={copy ? 'true' : undefined}>
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={`/events/category/${category.slug}`}
            // 22 chips drifting through the viewport would otherwise fetch 22
            // pages in the background on every visit.
            prefetch={false}
            tabIndex={copy ? -1 : undefined}
            className="ev-ribbon__chip"
          >
            <LocalizedText source={category.label} />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-labelledby={labelledBy} className="ev-ribbon">
      <div className="ev-ribbon__track">
        {set(false)}
        {set(true)}
      </div>
    </nav>
  );
}
