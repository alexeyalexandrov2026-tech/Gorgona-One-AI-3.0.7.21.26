// Disclosure for every page that promotes sportsbooks. US regulators and
// operator affiliate terms expect the age limit and a problem-gambling
// helpline next to betting promotions; some states require their own
// helpline wording, so have this reviewed for each market you advertise in.
export function ResponsibleGamingNotice({ className = '' }) {
  return (
    <p className={`text-xs leading-relaxed text-zinc-400 ${className}`}>
      21+ only (18+ where permitted). Sports betting is available only where it is legal, and every offer is
      subject to the operator&apos;s terms and eligibility rules. Gambling problem? Call 1-800-GAMBLER.
    </p>
  );
}
