import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { categories, stores, coupons, sportsbooks, analytics } from '../../../lib/mockData';
import { getEventCategories, getLeagues, getProviders, getAllEvents, TEAMS } from '../../../lib/mockEventsData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Stores
    for (const item of stores) {
      await supabase.from('stores').upsert({
        id: item.id, name: item.name, slug: item.slug, category: item.category, 
        logo: item.logo, website: item.website, affiliate_link: item.affiliate_link,
        description: item.description, status: item.status
      });
    }

    // 2. Coupons
    for (const item of coupons) {
      await supabase.from('coupons').upsert({
        id: item.id, store_id: item.store_id, code: item.code, discount: item.discount,
        description: item.description, expiration: item.expiration, status: item.status,
        clicks: item.clicks
      });
    }

    // 3. Sportsbooks
    for (const item of sportsbooks) {
      await supabase.from('sportsbooks').upsert({
        id: item.id, name: item.name, slug: item.slug, logo: item.logo, 
        description: item.description, website: item.website, affiliate_link: item.affiliate_link,
        promo_code: item.promo_code, bonus_offer: item.bonus_offer, 
        state_availability: item.state_availability, status: item.status
      });
    }

    // 4. Categories (MockData)
    for (const item of categories) {
      await supabase.from('categories').upsert({
        id: item.id, name: item.name, icon: item.icon
      });
    }

    // 5. Analytics (MockData)
    for (const item of analytics) {
      await supabase.from('analytics').upsert({
        id: item.id, coupon_id: item.coupon_id, clicks: item.clicks, date: item.date
      });
    }

    // 6. Event Categories
    const eventCats = getEventCategories();
    for (const item of eventCats) {
      await supabase.from('event_categories').upsert({
        slug: item.slug, label: item.label, icon: item.icon, category_group: item.categoryGroup || item.category_group || 'sports'
      });
    }

    // 7. Leagues
    const leagues = getLeagues();
    for (const item of leagues) {
      await supabase.from('leagues').upsert({
        slug: item.slug, name: item.name, sport: item.sport, category: item.category, website: item.website
      });
    }
    
    // We need to fetch leagues back to get their DB auto-generated IDs to map TEAMS
    const { data: dbLeaguesData, error: leaguesErr } = await supabase.from('leagues').select('id, slug');
    if (leaguesErr) throw new Error('Leagues fetch error: ' + leaguesErr.message);
    const dbLeagues = dbLeaguesData || [];

    // 8. Teams
    for (const item of TEAMS) {
      const league_id = dbLeagues.find(l => l.slug === item.league)?.id;
      if (league_id) {
        await supabase.from('teams').upsert({
          slug: item.slug, name: item.name, league_id, city: item.city, website: item.website
        });
      }
    }

    // 9. Providers
    const providers = getProviders();
    for (const item of providers) {
      await supabase.from('ticket_providers').upsert({
        slug: item.slug, name: item.name, website: item.website, affiliate_env_var: item.affiliate_env_var
      });
    }

    // 10. Events
    const events = getAllEvents();
    const { data: dbTeamsData, error: teamsErr } = await supabase.from('teams').select('id, slug');
    if (teamsErr) throw new Error('Teams fetch error: ' + teamsErr.message);
    const dbTeams = dbTeamsData || [];

    const { data: dbProvidersData, error: provErr } = await supabase.from('ticket_providers').select('id, slug');
    if (provErr) throw new Error('Providers fetch error: ' + provErr.message);
    const dbProviders = dbProvidersData || [];

    for (const item of events) {
      const league_id = item.league ? dbLeagues.find(l => l.slug === item.league)?.id : null;
      
      await supabase.from('events').upsert({
        id: item.id, slug: item.slug, name: item.name, category: item.category, league_id,
        artist: item.artist, venue: item.venue, city: item.city, state_or_country: item.state || item.country,
        event_date: item.date || '2026-08-01', event_time: item.time || '19:00:00', description: item.description, price_range: item.priceRange,
        featured: !!item.featured, trending: !!item.trending
      });

      // event_teams
      if (item.teams && dbTeams) {
        for (const tSlug of item.teams) {
          const t_id = dbTeams.find(t => t.slug === tSlug)?.id;
          if (t_id) {
            await supabase.from('event_teams').upsert({ event_id: item.id, team_id: t_id });
          }
        }
      }

      // event_providers
      if (item.providers && dbProviders) {
        for (const pSlug of item.providers) {
          const p_id = dbProviders.find(p => p.slug === pSlug)?.id;
          if (p_id) {
            await supabase.from('event_providers').upsert({ event_id: item.id, provider_id: p_id });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
