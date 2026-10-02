import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';
import { cleanText, escapeHtml, isValidEmail, singleLine } from '../../../lib/security/input';

// Booking requests from the public site.
//
// The request goes to the bookings table (guests may insert, only admins may
// read) and, when the mailer is configured, to ADMIN_EMAIL only. The address a
// visitor types is never used as a recipient, and every value is escaped
// before it reaches the email body.

const LIMITS = { name: 120, email: 254, phone: 40, dates: 120, itemSlug: 120, itemTitle: 200 };

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = cleanText(body?.name, LIMITS.name);
  const email = cleanText(body?.email, LIMITS.email);
  const phone = cleanText(body?.phone, LIMITS.phone);
  const dates = cleanText(body?.dates, LIMITS.dates);
  const itemSlug = cleanText(body?.itemSlug, LIMITS.itemSlug);
  const itemTitle = singleLine(body?.itemTitle, LIMITS.itemTitle);

  if (!name || !email || !dates) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  try {
    // No `.select()` here: guests may create a request but not read requests back.
    const { error: insertError } = await supabase.from('bookings').insert([{
      item_slug: itemSlug,
      item_title: itemTitle,
      client_name: name,
      client_email: email,
      client_phone: phone,
      dates,
      status: 'pending'
    }]);
    if (insertError) console.warn('[BOOKING] Could not store the request:', insertError.message);
  } catch (e) {
    console.warn('[BOOKING] Could not store the request:', e?.message || e);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (apiKey && adminEmail) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.NOTIFICATIONS_FROM_EMAIL || 'Gorgona Booking <onboarding@resend.dev>',
        to: adminEmail,
        reply_to: email,
        subject: `New Reservation Request: ${itemTitle || 'Gorgona One'}`,
        html: `
          <h2>New Booking Request</h2>
          <p><strong>Item:</strong> ${escapeHtml(itemTitle)} (${escapeHtml(itemSlug)})</p>
          <p><strong>Client Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Client Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Client Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Requested Dates:</strong> ${escapeHtml(dates)}</p>
        `
      });
    } catch (emailErr) {
      console.error('[BOOKING] Failed to send the admin email:', emailErr?.message || emailErr);
    }
  } else {
    console.warn('[BOOKING] RESEND_API_KEY or ADMIN_EMAIL is not set. Skipping email.');
  }

  return NextResponse.json({ success: true });
}
