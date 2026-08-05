import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const resendKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

console.log("Keys loaded:");
console.log("Supabase URL:", supabaseUrl ? "OK" : "MISSING");
console.log("Supabase Key:", supabaseKey ? "OK" : "MISSING");
console.log("Resend Key:", resendKey ? "OK" : "MISSING");
console.log("Admin Email:", adminEmail);

async function test() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend = new Resend(resendKey);

  console.log("\\nTesting Supabase...");
  try {
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    if (error) {
      console.error("Supabase Error:", error.message);
    } else {
      console.log("Supabase Connection: SUCCESS");
    }
  } catch (e) {
    console.error("Supabase Exception:", e.message);
  }

  console.log("\\nTesting Resend...");
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: adminEmail,
      subject: 'Test Email from Gorgona AI',
      html: '<p>If you receive this, Resend is working perfectly!</p>'
    });
    console.log("Resend Success:", data);
  } catch (e) {
    console.error("Resend Exception:", e);
  }
}

test();
