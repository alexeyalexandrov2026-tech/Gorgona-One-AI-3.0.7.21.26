import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { stores } from './lib/mockData.js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  for (const item of stores) {
    const { data, error } = await supabase.from('stores').upsert({
      id: item.id, name: item.name, slug: item.slug, category: item.category, 
      logo: item.logo, website: item.website, affiliate_link: item.affiliate_link,
      description: item.description, status: item.status
    });
    if (error) {
      console.error('Stores Upsert Error:', error);
    }
  }
  console.log('Stores seeded');
}

run();
