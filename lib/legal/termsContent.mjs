// Authoritative legal copy, ESIGN electronic agreement clauses, and SHA-256
// document integrity hashing for MIAMI ELIO (ALEXEY AAA LOGISTICS LLC d/b/a
// Gorgona One AI).
//
// Compliance guardrail (Florida Statute § 626.9541(1)(n)):
// ELIO+ Shield & Care 24/7 is strictly a contractual fulfillment & replacement
// guarantee plus 24/7 support unlocked upon confirmed reservation. It is NEVER
// described or offered as insurance or "free insurance".

export const TERMS_VERSION = '2026-11-23.v1';
export const TERMS_EFFECTIVE_DATE = 'November 23, 2026';
export const LEGAL_ENTITY = 'ALEXEY AAA LOGISTICS LLC d/b/a Gorgona One AI';
export const LEGAL_BRAND = 'MIAMI ELIO / ELIO+ Guide';
export const LEGAL_ADDRESS = '250 174th St, Sunny Isles Beach, FL 33160-3323, USA';
export const LEGAL_CONTACT_EMAIL = 'support@gorgona-one.com';

export const ESIGN_CLAUSES = Object.freeze([
  {
    id: 'agency',
    title: '1. Booking Facilitator & Limited Payment Collection Agent',
    body: `${LEGAL_ENTITY} (${LEGAL_BRAND}) acts solely as an independent booking facilitator and Limited Payment Collection Agent for the named service supplier stated on this confirmed quote. Your verified payment through this MIAMI ELIO checkout link satisfies your payment obligation to the named supplier for the itemized reservation amount.`
  },
  {
    id: 'liability',
    title: '2. Operating, Rental, Safety & Damage Liability',
    body: 'The named supplier is solely responsible for vessel, vehicle, aircraft, venue, or property operation, licensing, crew, maintenance, safety compliance, security deposits, and primary commercial insurance. All operating contracts, security deposits, fuel or crew charges (unless expressly itemized above), damage waivers, and accident or personal injury liability remain strictly between you and the named supplier.'
  },
  {
    id: 'shield',
    title: '3. ELIO+ Shield & Care 24/7 — Contractual Guarantee (Not Insurance)',
    body: 'Reservations confirmed and paid through MIAMI ELIO include ELIO+ Shield & Care 24/7: (a) a contractual 100% Fulfillment & Replacement Guarantee — if a confirmed supplier cancels or fails to deliver the reserved service, MIAMI ELIO will source a comparable or upgraded replacement or refund 100% of the funds collected by MIAMI ELIO; and (b) 24/7 dedicated live specialist support, including a private direct phone line unlocked immediately upon payment confirmation. IMPORTANT FLORIDA NOTICE (Fla. Stat. § 626.9541): ELIO+ Shield & Care 24/7 is a contractual fulfillment guarantee provided by MIAMI ELIO — it is NOT an insurance policy, indemnity contract, or licensed insurance product. Optional travel, marine, or rental insurance must be obtained separately from a licensed insurer or the named supplier.'
  },
  {
    id: 'cancellation',
    title: '4. Cancellation Policy, Verification & Disputes',
    body: 'The cancellation and refund schedule printed on this confirmed quote governs all rescheduling, weather adjustments, and cancellations. By signing electronically and completing payment via 3-D Secure (Stripe) or PayPal Business, you authorize this exact USD charge and agree to contact MIAMI ELIO support first so we can resolve any fulfillment issue under ELIO+ Shield & Care 24/7 prior to initiating a payment dispute.'
  },
  {
    id: 'esign',
    title: '5. Electronic Signature (ESIGN & Florida UETA) and Governing Law',
    body: `Under the U.S. Electronic Signatures in Global and National Commerce Act (15 U.S.C. § 7001) and the Florida Uniform Electronic Transaction Act (Fla. Stat. § 668.50), typing your full legal name and submitting this agreement creates a legally binding electronic signature permanently linked to the cryptographic SHA-256 hash of this quote and terms version (${TERMS_VERSION}). This agreement is governed by the laws of the State of Florida, with exclusive venue in Miami-Dade County, Florida.`
  }
]);

export const TERMS_SECTIONS = Object.freeze([
  {
    id: 'entity',
    title: '1. Operator & Scope of Platform',
    paragraphs: [
      `MIAMI ELIO (gorgona-one.com, the ELIO+ Guide assistant, and the Miami Elio mobile application) is operated by ${LEGAL_ENTITY}, located at ${LEGAL_ADDRESS}.`,
      'By browsing the platform, submitting a booking request, using the ELIO+ Guide assistant, or executing a verified checkout quote, you agree to these Terms of Service and our Privacy Policy. You must be at least 18 years old and legally capable of entering binding contracts to request or pay for services.'
    ]
  },
  {
    id: 'facilitator',
    title: '2. Booking Facilitator Role & Independent Third-Party Suppliers',
    paragraphs: [
      'MIAMI ELIO curates and coordinates luxury yacht charters, exotic vehicles, villas and hotels, private aviation referrals, restaurants, nightlife, event tickets, and curated experiences across Miami and South Florida. Unless expressly stated in writing on a signed quote, MIAMI ELIO does not own, operate, crew, drive, pilot, or manage the underlying vessels, vehicles, properties, or venues.',
      'Certain catalogue sections connect to independent partner platforms (including YATR for yacht charters, Stay22 for stays, Headout for experiences, TicketNetwork for event tickets, Ovago for flights, PrivateJetFinder for aviation referrals, and independent licensed local fleets). When you complete a transaction directly on a third-party website, that third party’s terms and privacy policy govern the transaction.'
    ]
  },
  {
    id: 'requests',
    title: '3. Non-Binding Requests, Quotes & Clickwrap Consent',
    paragraphs: [
      'Submitting a request through a listing form, ELIO+ Guide, or a trip plan does not charge your card or guarantee availability. Listed rates are indicative until our team verifies live inventory, dates, delivery logistics, security deposits, and cancellation rules with the operating supplier.',
      'When you submit a request form, we record your affirmative clickwrap acceptance of these Terms of Service and Privacy Policy together with the active terms version, timestamp, and a one-way cryptographic hash of your network ingress identifier.'
    ]
  },
  {
    id: 'payments',
    title: '4. Limited Payment Collection Agent & Verified On-Site Checkout',
    paragraphs: [
      'When MIAMI ELIO confirms a reservation with a vetted local supplier, our team issues a private, time-limited checkout link (/pay/<token>) stating the exact service, named supplier, dates, cancellation schedule, and total USD amount.',
      `For payments processed on gorgona-one.com via Stripe (with 3-D Secure / SCA verification) or PayPal Business, ${LEGAL_ENTITY} acts strictly as a Limited Payment Collection Agent on behalf of the named supplier. Payment cannot be initiated until you review and electronically sign the reservation agreement on the checkout page.`
    ]
  },
  {
    id: 'shield',
    title: '5. ELIO+ Shield & Care 24/7 — Contractual Fulfillment Guarantee (Not Insurance)',
    paragraphs: [
      'Every reservation confirmed and paid through a verified MIAMI ELIO checkout link includes ELIO+ Shield & Care 24/7 at no additional platform surcharge: (a) our contractual 100% Fulfillment & Replacement Guarantee, under which MIAMI ELIO will arrange a comparable or upgraded replacement or refund 100% of the amount collected by MIAMI ELIO if the named supplier cancels or fails to deliver the confirmed service; and (b) 24/7 dedicated live specialist assistance during your booking, including a private direct phone line unlocked exclusively after verified payment.',
      'Mandatory Non-Insurance Disclosure (Florida Statute § 626.9541): ELIO+ Shield & Care 24/7 is strictly a contractual customer-care and fulfillment guarantee backed by MIAMI ELIO. It is NOT an insurance policy, travel insurance, marine hull or P&I coverage, auto liability or collision waiver, medical coverage, or a licensed insurance product, and MIAMI ELIO does not sell, solicit, or provide free insurance. Guests seeking travel, weather, medical, marine, or rental insurance must purchase coverage separately from a licensed insurance carrier or through the named operating supplier.'
    ]
  },
  {
    id: 'liability',
    title: '6. Operating Liability, Deposits, Licensing & Guest Responsibility',
    paragraphs: [
      'Each named supplier independently holds responsibility for commercial licensing, vessel Coast Guard compliance, captain/crew qualifications, vehicle roadworthiness, property safety, and statutory operating insurance. Guests must present valid government identification, required driver’s licenses, personal auto/travel insurance where requested by the supplier, and any supplier-required security deposit at check-in or handover.',
      'MIAMI ELIO is not liable for mechanical failures, weather conditions, traffic or maritime delays, property damage, security-deposit deductions, bodily injury, or acts or omissions of independent suppliers or guests during service performance.'
    ]
  },
  {
    id: 'cancellations',
    title: '7. Cancellations, Weather Adjustments & Payment Disputes',
    paragraphs: [
      'Cancellation deadlines, rescheduling windows, and weather-deferral policies vary by vessel, vehicle, or venue and are disclosed verbatim on each confirmed checkout quote prior to signature. Once signed and paid, those quote-specific terms govern all refunds and modifications.',
      'If a fulfillment issue arises, you agree to notify MIAMI ELIO immediately via your Confirmed Reservation Pass support channels so our team can execute a replacement or verified refund before you file a card or PayPal chargeback.'
    ]
  },
  {
    id: 'ai',
    title: '8. ELIO+ Guide (ELIO) AI Recommendations',
    paragraphs: [
      'ELIO+ Guide (powered by ELIO) helps visitors navigate MIAMI ELIO’s real catalogue in 16 languages. AI-generated summaries are informational only and do not constitute a binding offer, legal advice, or guaranteed reservation until confirmed in writing by our team or the operating supplier.'
    ]
  },
  {
    id: 'cap',
    title: '9. Intellectual Property, Acceptable Use & Limitation of Liability',
    paragraphs: [
      'All MIAMI ELIO software, editorial content, trademarks, and interface designs belong to ALEXEY AAA LOGISTICS LLC or its licensors. Automated scraping, fraudulent bookings, abusive traffic, or circumvention of rate limits is prohibited.',
      'To the maximum extent permitted by Florida law, MIAMI ELIO is not liable for indirect, incidental, special, punitive, or consequential damages. Our aggregate contractual liability for any single claim is strictly limited to the total amount actually collected and retained by MIAMI ELIO for the specific confirmed booking giving rise to the claim.'
    ]
  },
  {
    id: 'law',
    title: '10. Electronic Signatures, Governing Law & Contact',
    paragraphs: [
      'Electronic confirmations, clickwrap consents, and ESIGN signatures executed on gorgona-one.com carry the same legal effect as handwritten signatures under 15 U.S.C. § 7001 and Fla. Stat. § 668.50.',
      `These Terms are governed by the laws of the State of Florida without regard to conflict-of-law rules. Any dispute that cannot be resolved amicably shall be brought exclusively in the state or federal courts located in Miami-Dade County, Florida. Legal notices and questions may be directed to ${LEGAL_CONTACT_EMAIL}.`
    ]
  }
]);

export const PARTNER_AGREEMENT_SECTIONS = Object.freeze([
  {
    id: 'status',
    title: '1. Independent Operating Supplier Relationship',
    paragraphs: [
      `This Partner Agreement governs businesses, fleet owners, charter operators, villa managers, and hospitality providers ("Partner") approved to list services or accept confirmed bookings through MIAMI ELIO, operated by ${LEGAL_ENTITY} (${LEGAL_ADDRESS}).`,
      'Partner operates strictly as an independent business entity and principal service provider. Nothing in this Agreement creates an employment, joint-venture, franchise, or partnership relationship between Partner and MIAMI ELIO.'
    ]
  },
  {
    id: 'compliance',
    title: '2. Licensing, Safety & Commercial Insurance Requirements',
    paragraphs: [
      'Partner represents and warrants that all vessels, vehicles, properties, personnel, and activities offered through MIAMI ELIO hold active, valid federal, state, and municipal licenses, permits, and inspections — including USCG credentials and qualified captains/crew for marine charters, commercial rental/fleet coverage for exotic vehicles, and local zoning compliance for stays.',
      'Partner must maintain active commercial general liability and asset-specific operating insurance covering guest operations at industry-standard limits and must provide proof of coverage upon reasonable request by MIAMI ELIO.'
    ]
  },
  {
    id: 'accuracy',
    title: '3. Inventory Accuracy, Rate Integrity & Listing Moderation',
    paragraphs: [
      'Partner is responsible for submitting accurate descriptions, authentic photography for which Partner holds full publication rights, real availability, security-deposit terms, and cancellation rules. All partner listings undergo manual moderation by MIAMI ELIO before publication.',
      'Partner agrees to honor confirmed rates and terms issued for MIAMI ELIO clients without undisclosed surcharges at handover.'
    ]
  },
  {
    id: 'collection',
    title: '4. Limited Payment Collection Agency & Remittance',
    paragraphs: [
      'Where a guest pays for a confirmed booking via MIAMI ELIO’s verified on-site checkout (Stripe or PayPal Business), Partner expressly appoints ALEXEY AAA LOGISTICS LLC d/b/a Gorgona One AI as Partner’s Limited Payment Collection Agent solely for collecting the agreed booking amount from the guest.',
      'MIAMI ELIO remits Partner’s net payout (agreed booking amount less MIAMI ELIO’s agreed commission and applicable third-party payment processing fees) on the settlement schedule confirmed in Partner’s onboarding or booking dispatch.'
    ]
  },
  {
    id: 'shield-cooperation',
    title: '5. ELIO+ Shield & Care 24/7 Fulfillment Obligations',
    paragraphs: [
      'Bookings confirmed through MIAMI ELIO carry our client-facing ELIO+ Shield & Care 24/7 fulfillment guarantee. Partner must immediately notify MIAMI ELIO of any mechanical, weather, staffing, or scheduling issue affecting a confirmed reservation and cooperate in good faith to deliver an equal or superior substitute.',
      'If Partner cancels without valid force majeure or fails to deliver a confirmed reservation, Partner forfeits payout for the unfulfilled booking and must promptly return any advanced funds so MIAMI ELIO can execute a full refund or replacement for the guest.'
    ]
  },
  {
    id: 'non-circumvention',
    title: '6. Client Respect & Anti-Circumvention',
    paragraphs: [
      'Partner agrees not to solicit a guest introduced by MIAMI ELIO to cancel an active MIAMI ELIO inquiry or confirmed checkout in order to rebook directly and bypass MIAMI ELIO’s agreed referral or commission structure for that trip.'
    ]
  },
  {
    id: 'indemnity',
    title: '7. Operating Liability & Indemnification',
    paragraphs: [
      'Partner retains sole operational responsibility for guest safety, asset maintenance, crew conduct, deposit handling, and regulatory compliance. Partner agrees to defend, indemnify, and hold harmless ALEXEY AAA LOGISTICS LLC, its officers, employees, and affiliates from any third-party claims, damages, fines, chargebacks caused by Partner non-delivery, or legal fees arising from Partner’s operations, assets, listings, or breach of this Agreement.'
    ]
  },
  {
    id: 'termination',
    title: '8. Moderation, Suspension & Governing Law',
    paragraphs: [
      'MIAMI ELIO may suspend or remove any listing or partner account immediately for safety concerns, repeated cancellations, misrepresentation, expired credentials, or unresolved client disputes. Existing confirmed reservations remain subject to Partner’s fulfillment and refund obligations.',
      `This Partner Agreement is governed by the laws of the State of Florida, with exclusive venue in Miami-Dade County, Florida. Partner inquiries: ${LEGAL_CONTACT_EMAIL}.`
    ]
  }
]);

export function canonicalAgreementPayload(quote) {
  return JSON.stringify({
    termsVersion: TERMS_VERSION,
    quoteId: String(quote?.id || ''),
    referenceCode: String(quote?.referenceCode || ''),
    itemTitle: String(quote?.itemTitle || ''),
    kind: String(quote?.kind || ''),
    supplierName: String(quote?.supplierName || ''),
    serviceDates: String(quote?.serviceDates || ''),
    cancellationPolicy: String(quote?.cancellationPolicy || ''),
    amountCents: Number(quote?.amountCents || 0),
    currency: String(quote?.currency || 'USD'),
    clientEmail: String(quote?.clientEmail || '').toLowerCase()
  });
}

export async function computeAgreementHash(quote) {
  const bytes = new TextEncoder().encode(canonicalAgreementPayload(quote));
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function formatUsdCents(cents) {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
