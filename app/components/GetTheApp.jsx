"use client";
import { useSavedText } from "./LocalizedText";
import { GOOGLE_PLAY_URL } from "../../lib/appLinks";

// Recognizable four-color Google Play prism mark so guests immediately identify
// the Android store link in both the top bar and the footer.
function GooglePlayMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M3.61 1.814L13.793 12 3.61 22.186a1.48 1.48 0 0 1-.61-1.2V3.014c0-.49.238-.925.61-1.2z"
      />
      <path
        fill="#34A853"
        d="M17.287 8.506L13.793 12 3.61 1.814a1.52 1.52 0 0 1 1.662-.15l12.015 6.842z"
      />
      <path
        fill="#EA4335"
        d="M13.793 12l3.494 3.494-12.015 6.842a1.52 1.52 0 0 1-1.662-.15L13.793 12z"
      />
      <path
        fill="#FBBC04"
        d="M20.772 10.49a1.73 1.73 0 0 1 0 3.02l-3.485 1.984L13.793 12l3.494-3.494 3.485 1.984z"
      />
    </svg>
  );
}

// Official-style dark Google Play store badge in the header and footer across
// all web browsers (desktop, Android, and iPhone/iPad Safari). Hidden only
// inside the native Android/iOS apps via CSS keyed on data-app-link.
export function GetTheApp({ variant = 'header' }) {
  const msg = useSavedText();
  const label = msg("Get the Miami Elio app on Google Play");

  if (variant === 'footer') {
    return (
      <a
        data-app-link
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="mt-6 inline-flex items-center gap-3 rounded-xl border border-g1-rule bg-[#061218]/85 px-4 py-2.5 text-g1-ink backdrop-blur-md transition hover:border-g1-accent/70 hover:bg-[#0a1d26]/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <GooglePlayMark className="h-7 w-7 shrink-0" />
        <span className="flex flex-col text-left leading-tight">
          <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.18em] text-g1-soft">{msg("Get it on")}</span>
          <span className="text-base font-semibold tracking-tight text-g1-ink">Google Play</span>
        </span>
      </a>
    );
  }

  return (
    <a
      data-app-link
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="tap-44 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-g1-rule bg-[#061218]/80 px-2 text-g1-ink backdrop-blur-md transition hover:border-g1-accent/70 hover:bg-[#0a1d26]/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:gap-2 sm:px-3"
    >
      <GooglePlayMark className="h-[17px] w-[17px] shrink-0 sm:h-5 sm:w-5" />
      <span className="flex flex-col text-left leading-none">
        <span className="hidden text-[9px] font-medium uppercase tracking-[0.1em] text-g1-soft sm:block">
          {msg("Get it on")}
        </span>
        <span className="whitespace-nowrap text-[11px] font-semibold tracking-tight text-g1-ink sm:text-[13px]">
          Google Play
        </span>
      </span>
    </a>
  );
}
