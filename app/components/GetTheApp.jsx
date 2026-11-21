"use client";
import { useSavedText } from "./LocalizedText";
import { APP_ICON, GOOGLE_PLAY_URL } from "../../lib/appLinks";

// A link to the Miami Elio app on Google Play: the app icon with "App" in the
// header, or the icon with two lines in the footer. Inside the Android app
// itself it is hidden (CSS keyed on data-app-link).
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
        className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-g1-rule px-3 py-2.5 pr-5 text-g1-ink transition hover:border-g1-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <img src={APP_ICON} alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
        <span className="flex flex-col leading-tight">
          <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.22em] text-g1-soft">{msg("Get it on")}</span>
          <span className="text-base font-medium">Google Play</span>
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
      className="tap-44 flex h-10 shrink-0 items-center gap-2 rounded-full border border-g1-rule p-1 text-sm font-medium text-g1-ink transition hover:border-g1-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:pr-3.5"
    >
      <img src={APP_ICON} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full" />
      <span className="hidden sm:inline">{msg("App")}</span>
    </a>
  );
}
