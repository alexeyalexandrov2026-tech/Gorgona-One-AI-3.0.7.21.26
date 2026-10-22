'use client';

import { useState } from 'react';
import { useGT } from 'gt-next';
import { useLocale } from '../../components/LocaleProvider';
import YatrCatalog from '../../yachts/YatrCatalog';
import Stay22Browse from '../../vacation-rentals/Stay22Browse';
import { getYatrCopy } from '../../../lib/yatrCopy';

export default function Fixture() {
  const gt = useGT();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const labels = {
    mapTitle: gt('Travel'),
    mapTab: gt('Travel'),
    location: 'Miami, FL',
    listTitle: gt('Rentals'),
    listTab: gt('Rentals'),
    scopeNotice: gt('No results found for your search.')
  };
  return (
    <main className="grid gap-8 py-10" data-testid="i18n-pilot">
      <h1 className="text-3xl">Explore Marketplace</h1>
      <form className="grid max-w-xl gap-3" onSubmit={(event) => {
        event.preventDefault();
        setShowResults(true);
      }}>
        <label htmlFor="pilot-query">Search deals</label>
        <input id="pilot-query" value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={gt('Search deals, stores, restaurants, and more')}
          aria-label={gt('Search deals')}
          className="rounded-xl border border-g1-rule bg-g1-card p-3" />
        <button type="submit" className="rounded-xl border border-g1-rule p-3">Search</button>
        {showResults && <p role="status">No results found for your search.</p>}
      </form>
      <h2 className="text-xl">Yachts</h2>
      <YatrCatalog copy={getYatrCopy(locale)} />
      <Stay22Browse labels={labels} />
    </main>
  );
}
