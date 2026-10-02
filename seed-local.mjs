import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { stores } from './lib/mockData.js';

// Local seeding only. Catalog tables accept writes from admins and trusted
// server keys, so this script needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
// That key bypasses row level security: keep it out of the repo, out of any
// NEXT_PUBLIC_ variable and out of the browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to seed.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function run() {
  for (const item of stores) {
    const { error } = await supabase.from('stores').upsert({
      id: item.id, name: item.name, slug: item.slug, category: item.category,
      logo: item.logo, website: item.website, affiliate_link: item.affiliate_link,
      description: item.description, status: item.status
    });
    if (error) {
      console.error('Stores Upsert Error:', error.message);
    }
  }
  console.log('Stores seeded');
}

run();
