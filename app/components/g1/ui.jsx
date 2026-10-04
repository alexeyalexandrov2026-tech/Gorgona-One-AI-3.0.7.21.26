// Shared building blocks of the new design. No hooks here, so server pages
// and client components can both use them.
import Link from 'next/link';
import Icon from './icons';

export const btn = {
  base: 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-transparent px-5 font-medium leading-none transition active:translate-y-px',
  primary: 'bg-g1-accent text-g1-on-accent hover:brightness-110',
  ink: 'bg-g1-ink text-g1-paper hover:opacity-90',
  ghost: 'border-g1-rule text-g1-ink hover:border-g1-ink',
  sm: 'min-h-[38px] px-4 text-[0.92rem]'
};

export const chipClass =
  'inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-full border border-g1-rule bg-g1-card px-4 text-[0.9rem] font-medium text-g1-ink transition hover:border-g1-ink aria-pressed:border-g1-ink aria-pressed:bg-g1-ink aria-pressed:text-g1-paper aria-[current=page]:border-g1-ink aria-[current=page]:bg-g1-ink aria-[current=page]:text-g1-paper';

export const eyebrowClass = 'font-g1sans text-[0.74rem] font-medium uppercase leading-[1.3] tracking-[0.2em] text-g1-soft';
export const sectionY = 'py-[clamp(36px,5vw,72px)]';

export function SectionHead({ title, sub, href, cta, id }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3.5 sm:mb-9">
      <div className="grid max-w-[62ch] gap-3">
        <h2 id={id} className="g1-display font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
          {title}
        </h2>
        {sub && <p className="max-w-[58ch] text-[clamp(1.02rem,0.3vw+0.95rem,1.15rem)] text-g1-soft [text-wrap:pretty]">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-2 border-b border-g1-rule pb-0.5 font-medium text-g1-ink transition-colors hover:border-g1-accent hover:text-g1-accent">
          {cta} <Icon name="arrow" className="g1-flip h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// Photo, meta line, title, short note and rate: one listing in a grid or shelf.
export function ListingCard({ href, img, alt = '', title, meta, note, rate, priority = false }) {
  return (
    <article className="group grid min-w-0 content-start gap-3">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block aspect-[3/2] overflow-hidden rounded-2xl bg-g1-rule">
        <img
          src={img}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          width="720"
          height="480"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
        />
      </Link>
      <div className="grid gap-1.5">
        <p className="text-[0.8rem] tracking-[0.02em] text-g1-soft">{meta}</p>
        <h3 className="font-g1display text-[1.28rem] font-medium leading-[1.15] text-g1-ink">
          <Link href={href} className="hover:text-g1-accent">{title}</Link>
        </h3>
        {note && <p className="line-clamp-2 text-[0.92rem] leading-normal text-g1-soft">{note}</p>}
        <p className="mt-1 text-[0.88rem] font-medium text-g1-ink">{rate}</p>
      </div>
    </article>
  );
}

// Text beside a framed photo: the opening of each world page.
export function WorldHero({ eyebrow, title, lede, img, alt, children }) {
  return (
    <header className="grid items-center gap-[clamp(24px,4vw,64px)] pb-[clamp(30px,4vw,56px)] pt-[clamp(24px,4vw,56px)] md:grid-cols-2">
      <div className="grid min-w-0 gap-[18px]">
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [overflow-wrap:break-word] [text-wrap:balance]">
          {title}
        </h1>
        <p className="max-w-[58ch] text-[clamp(1.06rem,0.35vw+1rem,1.22rem)] text-g1-soft [text-wrap:pretty]">{lede}</p>
        {children}
      </div>
      <figure className="aspect-[3/2] overflow-hidden rounded-[26px] bg-g1-rule">
        <img src={img} alt={alt} width="1600" height="1067" fetchPriority="high" className="h-full w-full object-cover" />
      </figure>
    </header>
  );
}

// Four numbered steps: how renting, chartering or staying works.
export function Steps({ title, steps }) {
  return (
    <section className={`border-t border-g1-rule ${sectionY}`}>
      <SectionHead title={title} />
      <ol className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([name, text], i) => (
          <li key={name} className="grid content-start gap-2 border-t-2 border-dashed border-g1-rule pt-4">
            <span className="font-g1mono text-[0.72rem] font-semibold tracking-[0.16em] text-g1-accent">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="font-g1display text-[1.3rem] font-medium leading-tight text-g1-ink">{name}</h3>
            <p className="text-[0.95rem] leading-normal text-g1-soft">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Label and value pairs between two dashed rules, like the back of a ticket.
export function Specs({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-y-2 border-dashed border-g1-rule py-4">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.12em] text-g1-soft">{label}</dt>
          <dd className="mt-1 font-medium text-g1-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Crumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 pt-6 text-[0.86rem] text-g1-soft">
      {items.map(([label, href], i) => (
        <span key={label} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">/</span>}
          {href ? <Link href={href} className="hover:text-g1-ink">{label}</Link> : <span aria-current="page" className="text-g1-ink">{label}</span>}
        </span>
      ))}
    </nav>
  );
}
