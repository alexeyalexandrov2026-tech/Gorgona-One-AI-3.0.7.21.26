"use client";

import { useState } from 'react';
import { dealUrl } from '../../../lib/homeData';
import { fill } from '../../../lib/homeCopy';
import Icon from './icons';

const camel = (slug) => slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const monogram = (name) =>
  name.replace(/[^A-Za-z0-9 &+]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || name.slice(0, 2);

// A promo code as a ticket: brand stub, tear line, offer and the code button.
// Showing the code copies it and leaves a link to the brand.
export default function Voucher({ deal, copy, categories, endsLabel }) {
  const [revealed, setRevealed] = useState(false);
  const [copyState, setCopyState] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const url = dealUrl(deal);

  async function reveal() {
    setRevealed(true);
    try {
      await navigator.clipboard.writeText(deal.promoCode);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div className="g1-ticket-wrap">
      <article className="g1-ticket g1-voucher" aria-label={`${deal.name}: ${deal.discount}`}>
        <div className="g1-stub">
          <div className="g1-plate">
            {deal.logo && !logoFailed ? (
              <img src={deal.logo} alt="" loading="lazy" onError={() => setLogoFailed(true)} />
            ) : (
              <span className="g1-monogram" aria-hidden="true">{monogram(deal.name)}</span>
            )}
          </div>
          <span className="g1-cat">{categories[camel(deal.category)] || deal.category}</span>
        </div>
        <div className="g1-vbody">
          <p className="text-[0.92rem] font-medium text-g1-soft">{deal.name}</p>
          <h3 className="text-[1.42rem] font-medium leading-[1.12] tracking-[-0.015em] text-g1-ink [text-wrap:balance]">{deal.discount}</h3>
          <p className="text-[0.8rem] text-g1-soft">
            {deal.promoCode ? copy.withCode : copy.noCode}
            {endsLabel && <> · {fill(copy.ends, { date: endsLabel })}</>}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            {deal.promoCode ? (
              <button
                type="button"
                className="g1-code-btn"
                data-revealed={revealed}
                onClick={reveal}
                aria-label={revealed ? `${deal.name}: ${deal.promoCode}` : `${copy.showCode}: ${deal.name}`}
              >
                <span className="g1-code">{revealed ? deal.promoCode : `${deal.promoCode.slice(0, 2)}•••`}</span>
                <span className="g1-cta">
                  {revealed && copyState === 'copied' && <Icon name="check" className="h-4 w-4" />}
                  {!revealed ? copy.showCode : copyState === 'copied' ? copy.copied : copy.copyFailed}
                </span>
              </button>
            ) : (
              <a className="g1-code-btn g1-deal" href={url} target="_blank" rel="noopener noreferrer sponsored">
                {copy.getDeal} <Icon name="out" className="h-4 w-4" />
              </a>
            )}
          </div>
          {revealed && (
            <p className="text-[0.84rem]" aria-live="polite">
              <a href={url} target="_blank" rel="noopener noreferrer sponsored" className="font-medium text-g1-accent underline-offset-2 hover:underline">
                {fill(copy.goTo, { name: deal.name })}
              </a>
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
