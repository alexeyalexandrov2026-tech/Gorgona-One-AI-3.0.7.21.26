import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// Admin notification hook for the partner portal (app/partner/page.js posts
// here on new_listing / listing_updated).
//
// The Resend client is constructed INSIDE the handler, never at module scope.
// Module scope is evaluated while Next.js collects page data during `next
// build`, where RESEND_API_KEY is not present - `new Resend(undefined)` throws
// "Missing API key. Pass it to the constructor `new Resend`" and fails the
// whole build. Per-request construction is cheap (the SDK is a thin fetch
// wrapper) and keeps the key read on the request path, where it exists.
// ===========================================================================

// The admin address and the partner-supplied name land in an HTML email body,
// so anything interpolated has to be escaped rather than trusted.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const event = String(body?.event || '').slice(0, 120);
  const partner = String(body?.partner || 'unknown').slice(0, 200);
  const filesCount = Number.isFinite(Number(body?.filesCount)) ? Number(body.filesCount) : 0;

  if (!event) {
    return NextResponse.json({ success: false, error: 'No event provided.' }, { status: 400 });
  }

  console.log(`[NOTIFICATION SYSTEM] Received event: ${event}`);
  console.log(`[NOTIFICATION SYSTEM] From partner: ${partner}`);

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

    console.log(`[NOTIFICATION SYSTEM] -> Dispatching email to ${adminEmail} via Resend...`);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `New Partner Activity: ${event}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>New Notification from Gorgona One</h2>
          <p><strong>Event:</strong> ${escapeHtml(event)}</p>
          <p><strong>Partner:</strong> ${escapeHtml(partner)}</p>
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
