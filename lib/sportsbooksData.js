import { supabase } from './supabase';
import { RENAMED_SPORTSBOOKS } from './sportsbookDirectory';

// Shows a renamed row under its new identity, whether or not
// database/03_rename_espn_bet.sql has run yet.
function applyRename(row) {
  if (!row) return row;
  const entry = Object.entries(RENAMED_SPORTSBOOKS).find(([, r]) => r.from === row.slug);
  if (!entry) return row;
  const [slug, rename] = entry;
  return { ...row, slug, name: rename.name, website: rename.website, affiliate_link: rename.website };
}

export async function getSportsbooks() {
  const { data, error } = await supabase
    .from('sportsbooks')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching sportsbooks:', error);
    return [];
  }
  return data.map(applyRename);
}

export async function getSportsbookBySlug(slug) {
  const { data, error } = await supabase
    .from('sportsbooks')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching sportsbook by slug:', error);
    return null;
  }
  if (data) return applyRename(data);

  // Database not renamed yet: read the old row.
  const rename = RENAMED_SPORTSBOOKS[slug];
  if (!rename) return null;
  const { data: old } = await supabase
    .from('sportsbooks')
    .select('*')
    .eq('slug', rename.from)
    .maybeSingle();
  return applyRename(old);
}
