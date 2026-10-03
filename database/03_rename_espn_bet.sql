-- ESPN BET became theScore Bet on December 1, 2025 (PENN Entertainment).
-- Renames the sportsbook row in place; its id and position stay the same.
-- Safe to run more than once.
update public.sportsbooks
   set name = 'theScore Bet',
       slug = 'thescore-bet',
       logo = 'TS',
       website = 'https://thescore.bet',
       affiliate_link = 'https://thescore.bet'
 where slug = 'espn-bet';

-- Where-it-is-legal sources now live in lib/sportsbookAvailability.js with a
-- check date; the old free-text column is no longer shown on the site.
