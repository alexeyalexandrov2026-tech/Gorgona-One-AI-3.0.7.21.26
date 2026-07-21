require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('events').select(`
    *,
    leagues ( slug ),
    event_providers ( ticket_providers ( slug ) ),
    event_teams ( teams ( slug ) )
  `).limit(1);
  console.log(JSON.stringify({ data, error }, null, 2));
}

run();
