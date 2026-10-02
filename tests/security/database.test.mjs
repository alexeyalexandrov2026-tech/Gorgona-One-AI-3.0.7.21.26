import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { asCaller, createDb, inTransaction, signUp } from './helpers/db.mjs';
import { HARDENED } from './helpers/root.mjs';

// Each test states the rule that must hold. Run against main (see
// tests/security/README.md) they show the hole; run against this branch they
// show it closed.

let db, user, partner, otherPartner, admin;

before(async () => {
  db = await createDb();
  user = await signUp(db, { email: 'user@example.com' });
  partner = await signUp(db, { email: 'partner@example.com', metadata: { role: 'partner' } });
  otherPartner = await signUp(db, { email: 'partner2@example.com', metadata: { role: 'partner' } });
  admin = await signUp(db, { email: 'admin@example.com' });
  // Promoted by the owner, the way an admin is created from the SQL editor.
  await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin]);
  await db.query(`insert into public.stores (id, name, slug, category, affiliate_link)
                  values (1, 'Store', 'store', 'shopping', 'https://partner.example/ref')`);
  await db.query(`insert into public.users (id, email, role) values ($1, 'user@example.com', 'user')`, [user]);
});

describe('roles', () => {
  test('sign-up metadata cannot create an admin', async () => {
    const id = await signUp(db, { email: 'signup@example.com', metadata: { role: 'admin' } });
    const { rows } = await db.query('select role from public.profiles where id = $1', [id]);
    assert.equal(rows[0].role, 'user');
  });

  test('a user cannot change their own role', async () => {
    await inTransaction(db, async () => {
      // No WHERE clause: only the UPDATE policy decides which rows change.
      await asCaller(db, user, `update public.profiles set role = 'admin'`);
      const { rows } = await db.query('select role from public.profiles where id = $1', [user]);
      assert.equal(rows[0].role, 'user');
    });
  });

  test('an admin can read every profile', async () => {
    await inTransaction(db, async () => {
      const result = await asCaller(db, admin, 'select count(*)::int as n from public.profiles');
      assert.ok(result.ok, result.error);
      assert.ok(result.rows[0].n >= 4);
    });
  });

  test('a user reads only their own profile', async () => {
    await inTransaction(db, async () => {
      const result = await asCaller(db, user, 'select id from public.profiles');
      assert.ok(result.ok, result.error);
      assert.deepEqual(result.rows.map((r) => r.id), [user]);
    });
  });
});

describe('catalog and private tables', () => {
  test('visitors can read the catalog', async () => {
    await inTransaction(db, async () => {
      const result = await asCaller(db, null, 'select count(*)::int as n from public.stores');
      assert.ok(result.ok, result.error);
      assert.equal(result.rows[0].n, 1);
    });
  });

  test('visitors cannot rewrite affiliate links', async () => {
    await inTransaction(db, async () => {
      await asCaller(db, null, `update public.stores set affiliate_link = 'https://attacker.example'`);
      const { rows } = await db.query('select affiliate_link from public.stores where id = 1');
      assert.equal(rows[0].affiliate_link, 'https://partner.example/ref');
    });
  });

  test('visitors cannot add coupons', async () => {
    await inTransaction(db, async () => {
      await asCaller(db, null, `insert into public.coupons (store_id, code, discount) values (1, 'FAKE', '99%')`);
      const { rows } = await db.query('select count(*)::int as n from public.coupons');
      assert.equal(rows[0].n, 0);
    });
  });

  test('visitors and users cannot read the users table', async () => {
    await inTransaction(db, async () => {
      for (const caller of [null, user]) {
        const result = await asCaller(db, caller, 'select email from public.users');
        assert.equal(result.rows.length, 0);
      }
    });
  });
});

describe('partner listings', () => {
  test('a new partner listing always waits for review', async () => {
    await inTransaction(db, async () => {
      await asCaller(db, partner,
        `insert into public.partner_listings (partner_id, title, status) values ($1, 'Yacht day', 'approved')`, [partner]);
      const { rows } = await db.query('select status from public.partner_listings where partner_id = $1', [partner]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, 'pending');
    });
  });

  test('a partner cannot list under another partner', async () => {
    await inTransaction(db, async () => {
      const result = await asCaller(db, partner,
        `insert into public.partner_listings (partner_id, title) values ($1, 'Not mine')`, [otherPartner]);
      assert.equal(result.ok, false);
    });
  });

  test('a regular user cannot create partner listings', async () => {
    await inTransaction(db, async () => {
      const result = await asCaller(db, user,
        `insert into public.partner_listings (partner_id, title) values ($1, 'Free ad')`, [user]);
      assert.equal(result.ok, false);
    });
  });

  test('a partner sees their own listings', async () => {
    await inTransaction(db, async () => {
      await db.query(`insert into public.partner_listings (partner_id, title) values ($1, 'Mine')`, [partner]);
      await db.query(`insert into public.partner_listings (partner_id, title) values ($1, 'Theirs')`, [otherPartner]);
      const result = await asCaller(db, partner, 'select title from public.partner_listings');
      assert.ok(result.ok, result.error);
      assert.deepEqual(result.rows.map((r) => r.title), ['Mine']);
    });
  });
});

describe('storage', () => {
  test('a regular user cannot upload listing media', async () => {
    await inTransaction(db, async () => {
      const result = await asCaller(db, user,
        `insert into storage.objects (bucket_id, name) values ('listings_media', $1)`, [`${user}/photo.jpg`]);
      assert.equal(result.ok, false);
    });
  });

  test('a partner uploads only into their own folder', async () => {
    await inTransaction(db, async () => {
      const foreign = await asCaller(db, partner,
        `insert into storage.objects (bucket_id, name) values ('listings_media', $1)`, [`${otherPartner}/photo.jpg`]);
      assert.equal(foreign.ok, false, 'upload into another partner’s folder was accepted');
      const own = await asCaller(db, partner,
        `insert into storage.objects (bucket_id, name) values ('listings_media', $1)`, [`${partner}/photo.jpg`]);
      assert.ok(own.ok, own.error);
    });
  });
});

describe('inventory listings', () => {
  // listings is created outside this repository; the migration only switches
  // on row level security when it is off, so this checks that path.
  test('visitors see only published listings', { skip: !HARDENED && 'needs the hardening migration' }, async () => {
    const inventory = await createDb({
      before: `create table public.listings (id int primary key, world text, status text);
               insert into public.listings values (1, 'yachts', 'published'), (2, 'yachts', 'draft');`
    });
    await inTransaction(inventory, async () => {
      const result = await asCaller(inventory, null, 'select id from public.listings');
      assert.ok(result.ok, result.error);
      assert.deepEqual(result.rows.map((r) => r.id), [1]);
    });
  });
});

describe('bookings', () => {
  test('visitors can send a booking request but not read requests', async () => {
    await inTransaction(db, async () => {
      const insert = await asCaller(db, null,
        `insert into public.bookings (client_name, client_email, dates) values ('Guest', 'guest@example.com', 'Dec 4-6')`);
      assert.ok(insert.ok, insert.error);
      const read = await asCaller(db, null, 'select client_email from public.bookings');
      assert.equal(read.rows.length, 0);
    });
  });
});
