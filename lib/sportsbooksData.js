import { supabase } from './supabase';

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
  return data;
}

export async function getSportsbookBySlug(slug) {
  const { data, error } = await supabase
    .from('sportsbooks')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error('Error fetching sportsbook by slug:', error);
    return null;
  }
  return data;
}
