import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

export async function POST(req) {
  try {
    const data = await req.json();
    const { name, phone, email, dates, itemSlug, itemTitle } = data;

    if (!name || !email || !dates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if user exists or register them implicitly in the background
    // Since we don't want to enforce strict auth errors during booking, 
    // we'll just insert the booking with the provided email.
    
    // 2. Insert into Supabase bookings table
    // (If the table doesn't exist yet, we catch the error and still send the email)
    let bookingId = null;
    try {
      const { data: bData, error: bError } = await supabase
        .from('bookings')
        .insert([
          {
            item_slug: itemSlug,
            item_title: itemTitle,
            client_name: name,
            client_email: email,
            client_phone: phone,
            dates: dates,
            status: 'pending'
          }
        ])
        .select()
        .single();
        
      if (!bError && bData) bookingId = bData.id;
    } catch (e) {
      console.warn("Supabase insert failed (table might not exist yet). Proceeding to email.");
    }

const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: 'Gorgona Booking <onboarding@resend.dev>', // Update this to a verified domain in production
          to: process.env.ADMIN_EMAIL || email, // Sending to the client as fallback for testing
          subject: `New Reservation Request: ${itemTitle}`,
          html: `
            <h2>New Booking Request</h2>
            <p><strong>Item:</strong> ${itemTitle} (${itemSlug})</p>
            <p><strong>Client Name:</strong> ${name}</p>
            <p><strong>Client Email:</strong> ${email}</p>
            <p><strong>Client Phone:</strong> ${phone}</p>
            <p><strong>Requested Dates:</strong> ${dates}</p>
            <p><strong>Database ID:</strong> ${bookingId || 'N/A'}</p>
          `
        });
        console.log(`[BOOKING NOTIFICATION] Email sent to admin for ${itemSlug}`);
      } catch (emailErr) {
        console.error('[BOOKING NOTIFICATION] Failed to send email:', emailErr);
      }
    } else {
      console.warn('[BOOKING NOTIFICATION] RESEND_API_KEY is not set. Skipping email dispatch.');
    }

    return NextResponse.json({ success: true, bookingId });
  } catch (error) {
    console.error('Booking Error:', error);
    return NextResponse.json({ error: 'Failed to process reservation' }, { status: 500 });
  }
}
