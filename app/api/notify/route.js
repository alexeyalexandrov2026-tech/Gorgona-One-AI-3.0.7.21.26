import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { event, partner, filesCount } = body;

    console.log(`[NOTIFICATION SYSTEM] Received event: ${event}`);
    console.log(`[NOTIFICATION SYSTEM] From partner: ${partner}`);
    
    // We get the admin email from the environment variable (which we will set)
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn('[NOTIFICATION SYSTEM] ADMIN_EMAIL is not set in environment. Skipping real email dispatch.');
      return NextResponse.json({ success: true, message: 'Simulated (No admin email set)' });
    }

    if (process.env.RESEND_API_KEY) {
      console.log(`[NOTIFICATION SYSTEM] -> Dispatching real Email to ${adminEmail} via Resend...`);
      
      const { data, error } = await resend.emails.send({
        from: 'Gorgona Notifications <notifications@gorgona-one.com>',
        to: adminEmail,
        subject: `New Partner Activity: ${event}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>New Notification from Gorgona One</h2>
            <p><strong>Event:</strong> ${event}</p>
            <p><strong>Partner:</strong> ${partner}</p>
            <p><strong>Files Attached:</strong> ${filesCount || 0}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">This is an automated message from the Gorgona One Partner Portal.</p>
          </div>
        `,
      });

      if (error) {
        console.error('[NOTIFICATION SYSTEM] Resend Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      console.log(`[NOTIFICATION SYSTEM] Email sent successfully! ID: ${data?.id}`);
    } else {
      console.warn('[NOTIFICATION SYSTEM] RESEND_API_KEY is not set. Skipping.');
    }

    return NextResponse.json({ success: true, message: 'Notification dispatched successfully' });
  } catch (error) {
    console.error('[NOTIFICATION SYSTEM] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process notification' }, { status: 500 });
  }
}
