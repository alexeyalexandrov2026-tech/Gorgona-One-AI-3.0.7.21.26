import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { escapeHtml } from '../../../lib/escapeHtml';
import { isHoneypotTripped, validateBooking } from '../../../lib/booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// Reservation requests from BookingForm (yachts, cars, villas, experiences).
//
// A request travels through two independent channels: a row in
// public.bookings and an email to ADMIN_EMAIL. The guest is told "sent" only
// when at least one of them actually succeeded. When both fail the route
// answers 503, so the form shows an error instead of silently losing the lead.
//
// public.bookings is INSERT-only for anon/authenticated (see
// database/schema.sql). Reading the new row back with `.select()` would need
// a SELECT policy, and without one PostgREST rejects the whole insert - so the
// id is generated here and the insert asks for no representation.
//
// The Resend client is constructed per request, never at module scope: module
// scope runs during `next build`, where RESEND_API_KEY is absent and
// `new Resend(undefined)` throws.
// ===========================================================================

// Resend's shared test sender. It only delivers to the Resend account owner,
// so set NOTIFICATIONS_FROM_EMAIL to an address on a verified domain.
const DEFAULT_FROM = 'Gorgona Booking <onboarding@resend.dev>';

async function storeBooking(id, booking) {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('bookings').insert({
      id,
      item_slug: booking.itemSlug || null,
      item_title: booking.itemTitle || null,
      client_name: booking.name,
      client_email: booking.email,
      client_phone: booking.phone || null,
      dates: booking.dates,
      status: 'pending'
    });
    if (error) {
      console.error('[BOOKING] Supabase insert failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[BOOKING] Supabase insert failed:', error?.message || error);
    return false;
  }
}

async function emailBooking(id, booking, stored) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) {
    console.warn('[BOOKING] RESEND_API_KEY or ADMIN_EMAIL is not set. Skipping email dispatch.');
    return false;
  }

  const item = booking.itemTitle || booking.itemSlug || 'Concierge request';

  try {
    const resend = new Resend(apiKey);
    // The SDK reports API failures (unverified sender, bad recipient, quota)
    // in `error` rather than throwing, so it has to be checked explicitly.
    const { error } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL || DEFAULT_FROM,
      to: adminEmail,
      replyTo: booking.email,
      subject: `New Reservation Request: ${item}`.replace(/[\r\n]+/g, ' '),
      html: `
        <h2>New Booking Request</h2>
        <p><strong>Item:</strong> ${escapeHtml(item)}${booking.itemSlug ? ` (${escapeHtml(booking.itemSlug)})` : ''}</p>
        <p><strong>Client Name:</strong> ${escapeHtml(booking.name)}</p>
        <p><strong>Client Email:</strong> ${escapeHtml(booking.email)}</p>
        <p><strong>Client Phone:</strong> ${escapeHtml(booking.phone || '—')}</p>
        <p><strong>Requested Dates:</strong> ${escapeHtml(booking.dates)}</p>
        <p><strong>Request ID:</strong> ${escapeHtml(id)} (${stored ? 'saved in public.bookings' : 'NOT saved in the database - this email is the only record'})</p>
      `
    });
    if (error) {
      console.error('[BOOKING] Resend rejected the email:', error.message || error.name || error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[BOOKING] Failed to send email:', error?.message || error);
    return false;
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Answer bots exactly like a success so they have nothing to adapt to.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ success: true, bookingId: null });
  }

  const result = validateBooking(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const booking = result.value;

  const id = crypto.randomUUID();
  const stored = await storeBooking(id, booking);
  const emailed = await emailBooking(id, booking, stored);

  if (!stored && !emailed) {
    console.error(`[BOOKING] Request for ${booking.itemSlug || 'unknown item'} was neither stored nor emailed.`);
    return NextResponse.json(
      { error: 'We could not submit your request right now. Please try again in a few minutes.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, bookingId: stored ? id : null });
}
