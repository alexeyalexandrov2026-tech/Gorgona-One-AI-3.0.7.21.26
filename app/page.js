"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Reveal, Stagger, StaggerItem, RiseMask, Parallax } from './components/Motion';
import GorgonaOneAI from './components/ai/GorgonaOneAI';
import { ecosystem } from '../lib/ecosystemData';
import { getTranslation } from '../lib/i18n';
import { useLocale } from './components/LocaleProvider';

const ArrowIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function HomePage() {
  const locale = useLocale();
  const t = getTranslation(locale);

  return (
    <main className="flex-1 theme-home">
      {/* ===== Cinematic hero — Planhat editorial foundation ===== */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[100svh] items-end">
        <div className="lux-hero__bg">
          <Parallax distance={80} className="h-full">
            <img
              src="https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=2400&q=80"
              alt=""
              className="lux-kenburns h-[115%] w-full object-cover"
            />
          </Parallax>
        </div>
        {/* Legibility washes — z-[-1] keeps them ABOVE the photo (bg sits at
            z-[-2]); the previous -z-10 accidentally hid them behind it.
            Top band anchors the nav, the angled left wash carries the text
            column, and the photo's right side (Sugarloaf) stays clear. */}
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.18)_22%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.30)_78%,rgba(5,5,5,0.9)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(78deg,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.36)_36%,rgba(0,0,0,0)_62%)]" />
        <div className="lux-grain" />
        <div className="lux-hero__grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-40 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lux-eyebrow"
          >
            {t.home.heroEyebrow}
          </motion.p>

          <h1 className="lux-display mt-6 text-[15vw] leading-[0.88] [text-shadow:0_4px_44px_rgba(0,0,0,0.5)] sm:text-7xl lg:text-8xl">
            <RiseMask delay={0.05}>{t.home.titleGorgona}</RiseMask>
            <RiseMask delay={0.15} className="text-brand-gold">{t.home.titleOne}</RiseMask>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-2xl font-display text-xl font-light leading-relaxed tracking-[-0.01em] text-[#eadfc8] [text-shadow:0_2px_20px_rgba(0,0,0,0.65)] sm:text-2xl"
          >
            {t.home.heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Link href="/stores" className="lux-btn">{t.home.exploreMarketplace} <ArrowIcon className="h-4 w-4" /></Link>
            <Link href="/coupons" className="lux-btn-ghost">{t.home.browseDeals}</Link>
            <Link href="/concierge" className="lux-btn-ghost">{t.home.askConcierge}</Link>
          </motion.div>

          <div className="mt-16 flex items-center gap-3 text-zinc-500">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.3em]">{t.home.scrollExplore}</span>
            <motion.span
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="text-brand-gold"
            >
              <ArrowIcon className="h-4 w-4 rotate-90" />
            </motion.span>
          </div>
        </div>
      </section>

      {/* ===== Gorgona One AI — ecosystem intelligence layer (directly below hero) ===== */}
      <section className="py-16 lg:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="lux-eyebrow">{t.home.aiEyebrow}</p>
            <h2 className="lux-display mt-5 max-w-2xl text-3xl sm:text-4xl">
              {t.home.aiTitle}
            </h2>
          </div>
          <p className="lux-lede text-base md:max-w-sm md:text-right">
            {t.home.aiLede}
          </p>
        </div>
        <Reveal className="mt-10">
          <GorgonaOneAI />
        </Reveal>
      </section>

      {/* ===== The ecosystem — eight worlds ===== */}
      <section className="py-20 lg:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="lux-eyebrow">{t.home.ecosystemEyebrow}</p>
            <h2 className="lux-display mt-5 max-w-2xl text-4xl sm:text-5xl">
              {t.home.ecosystemTitle}
            </h2>
          </div>
          <p className="lux-lede text-base md:text-right">
            {t.home.ecosystemLede}
          </p>
        </div>

        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.07}>
          {ecosystem.map((item) => (
            <StaggerItem key={item.id} className={item.theme}>
              <Link href={item.href} className="lux-tile group flex h-[300px] flex-col justify-end p-6">
                <div className="lux-tile__media">
                  <img src={item.image} alt={item.label} className="h-full w-full object-cover" />
                </div>
                <div className="lux-tile__scrim" />
                <div className="lux-tile__glow" />
                <div className="relative">
                  <p className="lux-caption-upper">{item.tagline}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-white">{item.label}</h3>
                    <ArrowIcon className="h-5 w-5 shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300/90">{item.description}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ===== Closing partner CTA ===== */}
      <section className="pb-8">
        <Reveal>
          <div className="lux-hero relative overflow-hidden rounded-3xl border border-white/10 px-8 py-16 text-center sm:px-16">
            <div className="lux-hero__grain" />
            <p className="lux-eyebrow justify-center">{t.home.partnerEyebrow}</p>
            <h2 className="lux-display mx-auto mt-5 max-w-2xl text-3xl sm:text-4xl">
              {t.home.partnerTitle}
            </h2>
            <p className="lux-lede mx-auto mt-5 text-base">
              {t.home.partnerLede}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/partner" className="lux-btn">{t.home.joinPartner} <ArrowIcon className="h-4 w-4" /></Link>
              <Link href="/login" className="lux-btn-ghost">{t.home.signIn}</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
