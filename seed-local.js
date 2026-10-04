require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { categories, stores, coupons, sportsbooks, analytics } = require('./lib/mockData');
const { getEventCategories, getLeagues, getProviders, getAllEvents, TEAMS } = require('./lib/eventsData-old') || {}; // wait I deleted old eventsData!

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  for (const item of stores) {
    const { data, error } = await supabase.from('stores').upsert({
      id: item.id, name: item.name, slug: item.slug, category: item.category, 
      logo: item.logo, website: item.website, affiliate_link: item.affiliate_link,
      description: item.description, status: item.status
    });
    if (error) console.error('Stores Upsert Error:', error);
  }
  console.log('Stores seeded');
}

run();
