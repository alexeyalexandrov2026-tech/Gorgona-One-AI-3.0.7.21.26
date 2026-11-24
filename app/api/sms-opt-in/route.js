export const dynamic = 'force-dynamic';

const HELP_EMAIL = 'miami-elio@gorgona-one.com';
const CONSENT_VERSION = 'sms-opt-in-2026-11-24';

function normalizeUsMobile(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  let e164 = null;
  if (digits.length === 10) e164 = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith('1')) e164 = `+${digits}`;
  if (!e164 || !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(e164)) return null;
  return e164;
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Please send a valid request.' }, 400);
  }

  if (body?.consent !== true) {
    return json({ ok: false, error: 'Please check the consent box to opt in.' }, 400);
  }

  const mobileNumber = normalizeUsMobile(body?.mobileNumber);
  if (!mobileNumber) {
    return json({ ok: false, error: 'Please enter a valid U.S. mobile number.' }, 400);
  }

  const consentedAt = new Date().toISOString();
  const record = {
    mobile_number: mobileNumber,
    consented_at: consentedAt,
    consent: true,
    consent_version: CONSENT_VERSION,
    source: 'https://gorgona-one.com/sms-alerts',
    program: 'Miami Elio booking and customer service SMS',
    sender: '+18339468811'
  };

  let stored = false;
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/sms_opt_ins`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(record)
      });
      stored = response.ok;
    } catch {
      stored = false;
    }
  }

  let emailed = false;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM_EMAIL;
  if (resendKey && from) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [HELP_EMAIL],
          subject: 'Miami Elio SMS opt-in',
          text: [
            'A client opted in to Miami Elio SMS alerts.',
            `Mobile number: ${mobileNumber}`,
            `Consented at: ${consentedAt}`,
            `Consent version: ${CONSENT_VERSION}`,
            'Source: https://gorgona-one.com/sms-alerts',
            `Stored in database: ${stored ? 'yes' : 'no'}`,
            '',
            'Program: booking confirmations, reservation updates, and customer service replies from +18339468811.',
            `Help: ${HELP_EMAIL}`
          ].join('\n')
        })
      });
      emailed = response.ok;
    } catch {
      emailed = false;
    }
  }

  if (!stored && !emailed) {
    return json({ ok: false, error: 'We could not save your opt-in just now. Please write to ' + HELP_EMAIL + '.' }, 503);
  }

  return json({ ok: true });
}
