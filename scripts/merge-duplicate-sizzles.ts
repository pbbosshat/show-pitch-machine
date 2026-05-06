/**
 * merge-duplicate-sizzles.ts
 *
 * Merges duplicate ip_catalog entries that represent the same show imported
 * from different Google Sheet tabs. For each pair, one "canonical" entry is kept
 * and all data from the duplicate (threads, decks, sizzles) is moved to it.
 *
 * The canonical choice prioritises the most authoritative sheet:
 *   Priorities > Full Dev List > BC/MYE > Backburner > Passes
 *
 * Run:  npx tsx scripts/merge-duplicate-sizzles.ts
 */

import { getDb, run, query } from '../lib/db';

const db = getDb();

interface MergePair {
  show: string;
  keepId: string;   // ip_catalog_id to keep
  deleteIds: string[]; // ip_catalog_ids to merge into keepId and delete
  // Which sizzle_reel to keep on the canonical ip? 'keep' = the one already on keepId, 'delete' = move from deleteId
  sizzleStrategy: 'keep' | 'move';
}

// Full merge list — canonical choice based on sheet authority
const MERGES: MergePair[] = [
  {
    show: "Meet the Bennett's/Women Wrestling Army",
    keepId:    'b0c74afb-e3fe-4fa1-8472-be34c03b1173', // BC/MYE
    deleteIds: ['b0d9ef7f-0b85-462b-b8ce-042373949595'], // Backburner
    sizzleStrategy: 'keep', // both raw="Sizzle", keep canonical
  },
  {
    show: 'Golden Girls / Gran Theft',
    keepId:    'aeb53ef5-8457-43cd-ada4-317052e5519a', // Full Dev List — has "Funeral Sizzle / News Sizzle"
    deleteIds: ['b81c9e86-3c3a-4ec6-a597-bdc58b1a331c'], // Backburner — raw was just network names
    sizzleStrategy: 'keep',
  },
  {
    show: 'Jimmy Dennis',
    keepId:    '988bdda6-d85b-4b7b-916b-7756671da731', // Backburner — raw="Sizzle"
    deleteIds: ['2d2ef754-7e2a-46bd-a48f-eb22919364c6'], // Passes — raw was action note, not a sizzle ref
    sizzleStrategy: 'keep',
  },
  {
    show: 'My Psychic Family',
    keepId:    'd2a93e37-9539-4af7-bbd6-2dfc55999ea2', // Backburner
    deleteIds: ['dda9e04d-ef45-49c9-a9c3-5bdd17e3f10a'], // Passes
    sizzleStrategy: 'keep',
  },
  {
    show: 'Pros vs Joes',
    keepId:    'fe8982fc-fa30-48f7-8f0a-22489e9b1846', // Priorities — most authoritative
    deleteIds: [
      '565540d8-3ec0-42c8-944d-930d6e4afb79', // Backburner
      'ee294c01-e0f7-4d99-9232-6763ae47a520', // Full Dev List
      '1316b6cb-c7ae-457c-9a16-e9d370cb060a', // Full Development list
    ],
    sizzleStrategy: 'keep',
  },
  {
    show: 'Quizzy Horror Show',
    keepId:    'c3bcf00f-bc29-408f-9707-1c9a4da569d5', // Full Dev List
    deleteIds: ['49e18a2e-3742-439f-99dc-9b029e7cb272'], // Backburner
    sizzleStrategy: 'keep', // both raw="Sizzle"
  },
  {
    show: 'Scam Dunk / Dark Side Of Basketball',
    keepId:    '732d56f5-abbb-47ef-b9ed-d8dab82da167', // Full Dev List — has "Sizzle PW: HoopDreams"
    deleteIds: ['1c7a2050-8ccf-4f06-a945-98282cb2e0f9'], // Backburner — raw was network list
    sizzleStrategy: 'keep',
  },
  {
    show: 'Smashed Hits',
    keepId:    '36339ea5-9053-437f-ae98-09b129ac1645', // Backburner
    deleteIds: ['309787de-b923-4ebe-85d7-3608a1671e4b'], // Passes — identical sizzle raw_value
    sizzleStrategy: 'keep',
  },
  {
    show: 'The Botched Exorcism of Annelise Michel / The Murder of Annelise Michel',
    keepId:    'e44d25ea-5081-4931-afde-fc2271fa5d0f', // Full Dev List — raw="Sizzle"
    deleteIds: ['a8a77c63-154d-40b4-8c1d-ff4db82369e7'], // Backburner — raw was "Travel, Netflix"
    sizzleStrategy: 'keep',
  },
  {
    show: 'The Bouchards (cross-ip video duplicate)',
    keepId:    'f3512a10-a835-44f2-9e77-97c669403e46', // Priorities — already has 2 sizzles
    deleteIds: ['c2b63379-ebca-40c5-8c1e-e24f749b16dc'], // Full Development list — same Vimeo URL as one already on keep
    sizzleStrategy: 'keep', // Priorities already has this video; the Full Dev List sizzle is a true dup
  },
];

// Tables that reference ip_catalog_id and must be re-pointed
const CHILD_TABLES = ['dev_tasks', 'pitch_decks', 'project_email_threads', 'shows', 'story_scout'] as const;

function mergePair(keepId: string, deleteId: string, showName: string): void {
  // 1. Move child rows — skip rows that would violate unique constraints by checking first
  for (const table of CHILD_TABLES) {
    if (table === 'project_email_threads') {
      // thread_id must be unique per ip_catalog_id — skip threads already on keepId
      const existing = query<{ thread_id: string }>(
        `SELECT thread_id FROM project_email_threads WHERE ip_catalog_id = ?`, [keepId]
      ).map(r => r.thread_id);
      const existingSet = new Set(existing);

      const toMove = query<{ id: string; thread_id: string }>(
        `SELECT id, thread_id FROM project_email_threads WHERE ip_catalog_id = ?`, [deleteId]
      );
      for (const row of toMove) {
        if (!existingSet.has(row.thread_id)) {
          run(`UPDATE project_email_threads SET ip_catalog_id = ? WHERE id = ?`, [keepId, row.id]);
        } else {
          // True duplicate thread — delete it
          run(`DELETE FROM project_email_threads WHERE id = ?`, [row.id]);
        }
      }
    } else if (table === 'pitch_decks') {
      // Move all decks from delete to keep; skip only exact (ip_catalog_id, raw_value) dupes
      const existingRaws = query<{ raw_value: string }>(
        `SELECT raw_value FROM pitch_decks WHERE ip_catalog_id = ?`, [keepId]
      ).map(r => r.raw_value);
      const existingSet = new Set(existingRaws);

      const toMove = query<{ id: string; raw_value: string }>(
        `SELECT id, raw_value FROM pitch_decks WHERE ip_catalog_id = ?`, [deleteId]
      );
      for (const row of toMove) {
        if (!existingSet.has(row.raw_value)) {
          run(`UPDATE pitch_decks SET ip_catalog_id = ? WHERE id = ?`, [keepId, row.id]);
        } else {
          run(`DELETE FROM pitch_decks WHERE id = ?`, [row.id]);
        }
      }
    } else {
      // Generic move — no unique constraint concerns on these tables for ip_catalog_id alone
      run(`UPDATE ${table} SET ip_catalog_id = ? WHERE ip_catalog_id = ?`, [keepId, deleteId]);
    }
  }

  // 2. Handle sizzle_reels — unique index on (ip_catalog_id, raw_value) means we can't
  //    move a sizzle to keepId if it already has one with the same raw_value.
  //    Strategy: move only if it adds new data (different raw_value AND different vimeo_url);
  //    delete if it would duplicate what the keep entry already has.
  const keepSizzles = query<{ id: string; vimeo_url: string | null; raw_value: string | null }>(
    `SELECT id, vimeo_url, raw_value FROM sizzle_reels WHERE ip_catalog_id = ?`, [keepId]
  );
  const deleteSizzles = query<{ id: string; vimeo_url: string | null; raw_value: string | null }>(
    `SELECT id, vimeo_url, raw_value FROM sizzle_reels WHERE ip_catalog_id = ?`, [deleteId]
  );

  for (const ds of deleteSizzles) {
    const sameRaw = keepSizzles.some(ks => ks.raw_value === ds.raw_value);
    const sameUrl = ds.vimeo_url && keepSizzles.some(ks => ks.vimeo_url === ds.vimeo_url);

    if (sameRaw || sameUrl) {
      // True duplicate — discard it; the keep entry already has this data
      run(`DELETE FROM sizzle_reels WHERE id = ?`, [ds.id]);
    } else {
      // Adds new data (different raw_value + unique or absent URL) — move it to canonical ip
      run(`UPDATE sizzle_reels SET ip_catalog_id = ? WHERE id = ?`, [keepId, ds.id]);
    }
  }

  // 3. Delete the now-empty ip_catalog entry
  run(`DELETE FROM ip_catalog WHERE id = ?`, [deleteId]);
}

// SQLite requires PRAGMA foreign_keys changes to happen OUTSIDE any transaction.
// Disable here, run the merge in a transaction, re-enable after commit.
db.exec('PRAGMA foreign_keys = OFF;');

const stmt = db.prepare('BEGIN');
stmt.run();

try {
  for (const merge of MERGES) {
    console.log(`\nMerging: "${merge.show}"`);
    for (const deleteId of merge.deleteIds) {
      const ic = query<{ sheet_source: string }>(`SELECT sheet_source FROM ip_catalog WHERE id = ?`, [deleteId])[0];
      const keepIc = query<{ sheet_source: string }>(`SELECT sheet_source FROM ip_catalog WHERE id = ?`, [merge.keepId])[0];
      console.log(`  [${keepIc?.sheet_source}] ← absorbs [${ic?.sheet_source || 'MISSING'}]`);
      mergePair(merge.keepId, deleteId, merge.show);
    }
  }

  db.prepare('COMMIT').run();
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('\n✓ All merges committed successfully.');
} catch (err) {
  db.prepare('ROLLBACK').run();
  db.exec('PRAGMA foreign_keys = ON;');
  console.error('\n✗ Merge failed — rolled back:', err);
  process.exit(1);
}

// Final counts
const sizzleTotal = query<{ c: number }>('SELECT COUNT(*) as c FROM sizzle_reels')[0]?.c;
const withVideo   = query<{ c: number }>(`SELECT COUNT(*) as c FROM sizzle_reels WHERE vimeo_url IS NOT NULL AND vimeo_url != ''`)[0]?.c;
const ipTotal     = query<{ c: number }>('SELECT COUNT(*) as c FROM ip_catalog')[0]?.c;
console.log(`\nPost-merge: ${sizzleTotal} sizzle_reels (${withVideo} with video) | ${ipTotal} ip_catalog entries`);
