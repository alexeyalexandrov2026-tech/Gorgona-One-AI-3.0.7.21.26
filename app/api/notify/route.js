import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { escapeHtml } from '../../../lib/escapeHtml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// Admin notification hook for the partner portal (app/partner/page.js posts
// here on new_listing / listing_updated).
//
// Only signed-in users can trigger it: the portal sends its Supabase access
// token as `Authorization: Bearer <jwt>`, the token is verified with Supabase
// Auth, and the partner shown in the email is read from the verified account
// rather than from the request body - so the endpoint cannot be used to spam
// the admin inbox or to put arbitrary names into the email.
//
// The Resend client is constructed INSIDE the handler, never at module scope.
// Module scope is evaluated while Next.js collects page data during `next
// build`, where RESEND_API_KEY is not present - `new Resend(undefined)` throws
// "Missing API key. Pass it to the constructor `new Resend`" and fails the
// whole build. Per-request construction is cheap (the SDK is a thin fetch
// wrapper) and keeps the key read on the request path, where it exists.
// ===========================================================================

const EVENTS = new Set(['new_listing', 'listing_updated']);

async function verifiedUser(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    return error ? null : data?.user || null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const user = await verifiedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const event = String(body?.event || '');
  if (!EVENTS.has(event)) {
    return NextResponse.json({ success: false, error: 'Unknown event.' }, { status: 400 });
  }

  const partner =
    String(user.user_metadata?.company_name || user.user_metadata?.name || user.email || user.id).slice(0, 200);
  const rawCount = Number(body?.filesCount);
  const filesCount = Number.isFinite(rawCount) ? Math.min(Math.max(Math.trunc(rawCount), 0), 100) : 0;

  console.log(`[NOTIFICATION SYSTEM] Received event: ${event} from user ${user.id}`);

  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const fromAddress =
    process.env.NOTIFICATIONS_FROM_EMAIL ||
    'Gorgona Notifications <notifications@gorgona-one.com>';

  // Email delivery is optional configuration, not a prerequisite: with either
  // value missing the portal still succeeds and the event is logged only, so a
  // partner submission never fails because the mailer is unconfigured.
  if (!adminEmail) {
    console.warn('[NOTIFICATION SYSTEM] ADMIN_EMAIL is not set. Skipping email dispatch.');
    return NextResponse.json({ success: true, message: 'Logged (no admin email configured)' });
  }

  if (!apiKey) {
    console.warn('[NOTIFICATION SYSTEM] RESEND_API_KEY is not set. Skipping email dispatch.');
    return NextResponse.json({ success: true, message: 'Logged (no mailer configured)' });
  }

  try {
    // Constructed per request - see the note above on why this cannot be hoisted.
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `New Partner Activity: ${event}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>New Notification from Gorgona One</h2>
          <p><strong>Event:</strong> ${escapeHtml(event)}</p>
          <p><strong>Partner:</strong> ${escapeHtml(partner)}</p>
          <p><strong>Account email:</strong> ${escapeHtml(user.email || '')}</p>
          <p><strong>Files Attached:</strong> ${filesCount}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">This is an automated message from the Gorgona One Partner Portal.</p>
        </div>
      `
    });

    if (error) {
      console.error('[NOTIFICATION SYSTEM] Resend error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to dispatch notification' },
        { status: 502 }
      );
    }

    console.log(`[NOTIFICATION SYSTEM] Email sent successfully! ID: ${data?.id}`);
    return NextResponse.json({ success: true, message: 'Notification dispatched successfully' });
  } catch (error) {
    console.error('[NOTIFICATION SYSTEM] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}
