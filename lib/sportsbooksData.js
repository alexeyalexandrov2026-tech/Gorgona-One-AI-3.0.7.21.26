import { supabase, isSupabaseConfigured } from './supabase';
import { sportsbooks as BUNDLED_SPORTSBOOKS } from './mockData';

// Sportsbook profiles. public.sportsbooks in Supabase is the editable source
// whenever it has rows; the list bundled in lib/mockData.js keeps every
// /sportsbook/[slug] page and the sitemap working while that table is empty
// or Supabase is not configured (the hardcoded /sportsbook directory links to
// all ten profiles either way).

function bundledActive() {
  return BUNDLED_SPORTSBOOKS
    .filter((book) => book.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSportsbooks() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sportsbooks')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) console.error('Error fetching sportsbooks:', error.message);
    else if (data?.length) return data;
  }
  return bundledActive();
}

export async function getSportsbookBySlug(slug) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sportsbooks')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) console.error('Error fetching sportsbook by slug:', error.message);
    else if (data) return data;
  }
  return BUNDLED_SPORTSBOOKS.find((book) => book.slug === slug) || null;
}
