// Governing English text of the privacy policy shown at /privacy, for the
// website and the Miami Elio Android app. It must stay consistent with the
// Google Play Data safety answers. Operator, contact, retention periods,
// AI provider and audience age were confirmed by the owner on 2026-11-14.
// Other locales show this English text with a translated notice.

export const PRIVACY_CONTACT_EMAIL = 'support@gorgona-one.com';
export const PRIVACY_LAST_UPDATED = 'November 14, 2026';
export const PRIVACY_UPDATED_LINE = `Last updated: ${PRIVACY_LAST_UPDATED}`;

export const PRIVACY_SECTIONS = [
  {
    heading: 'Who we are',
    paragraphs: [
      'Miami Elio is the Miami travel and concierge service at gorgona-one.com and in the Miami Elio Android app. It is operated by Alexey AAA Logistics LLC, Florida, USA ("we", "us"). This policy applies to the website and to the app.',
      `Questions about this policy or your data: ${PRIVACY_CONTACT_EMAIL}.`
    ]
  },
  {
    heading: 'What we collect',
    items: [
      'Account: when you create an account, your name, email address and account ID. Sign-in is handled by Supabase Auth.',
      'Trip and booking requests: when you send a request, your name, email address, phone number, travel dates, party size, the catalogue items you chose and any note you add.',
      'Favorites: when you are signed in, references to the catalogue items you save. Favorites saved without an account stay on your device.',
      'AI concierge: the messages you send are processed to produce an answer. We do not store the conversation text on our servers; recent conversation history is kept on your device for the current session. To prevent abuse we keep usage counters tied to a pseudonymous key, not your raw IP address.',
      'Reported answers: when you report a concierge answer, the question, the answer, any note you add, the language and a session reference.',
      'Account deletion requests: your account ID and the time of the request.',
      'Website analytics: on the website, outside the app, Cloudflare Web Analytics counts page views in aggregate without cookies. It is not loaded in the Miami Elio app.'
    ],
    paragraphs: [
      'The app does not collect your location, contacts, photos or payment details. Please do not send payment details, passwords or identity documents in the concierge chat.'
    ]
  },
  {
    heading: 'How we use it',
    paragraphs: [
      'We use this information to answer concierge questions, process and confirm your requests, keep your account and favorites, review reported answers, handle deletion requests, and keep the service secure. We do not sell personal data, we do not use it for advertising, and the app shows no ads.'
    ]
  },
  {
    heading: 'Who processes it for us',
    paragraphs: [
      'Supabase (database and sign-in), Cloudflare (hosting, AI processing with Cloudflare Workers AI, and website analytics) and Telegram (internal notifications to our team about new requests and reports). These providers act on our instructions and may process data outside your country, including in the United States. We do not share your personal data with other third parties for their own purposes.'
    ]
  },
  {
    heading: 'Dictation and reminders',
    paragraphs: [
      'Optional dictation uses your device’s speech recognition service; Miami Elio receives only the resulting text. Depending on your device and language, that service may process your voice online under its own terms. Event reminders are scheduled on your device.'
    ]
  },
  {
    heading: 'How long we keep it',
    items: [
      'Trip and booking requests and plans: 24 months after the request.',
      'Reported concierge answers: 12 months after the report.',
      'Account data and favorites: until you delete your account.',
      'Backups: deleted data is removed from backups within 30 days.'
    ],
    paragraphs: [
      'We keep a record longer only when the law requires it.'
    ]
  },
  {
    heading: 'Your choices and account deletion',
    paragraphs: [
      `You can request deletion of your account and its data at gorgona-one.com/account/delete or by writing to ${PRIVACY_CONTACT_EMAIL}. We complete deletion requests within 30 days, except records we must keep by law. You can also write to us to access or correct your data.`
    ]
  },
  {
    heading: 'Security',
    paragraphs: [
      'Data is sent over encrypted HTTPS connections, and access to stored data is limited to the people and services that need it to run Miami Elio.'
    ]
  },
  {
    heading: 'Age',
    paragraphs: [
      'Miami Elio is intended for adults 18 and over and is not directed to children. If we learn that a person under 18 has given us personal data, we will delete it.'
    ]
  },
  {
    heading: 'Changes',
    paragraphs: [
      'When this policy changes, we update this page and the date at the top.'
    ]
  }
];
