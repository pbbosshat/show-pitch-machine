import { initDb, query } from '../lib/db';
initDb();
const rows = query<{source:string;cnt:number}>('SELECT source, COUNT(*) as cnt FROM trade_articles GROUP BY source ORDER BY cnt DESC');
rows.forEach(r => console.log(`${r.source}: ${r.cnt}`));
const total = query<{cnt:number}>('SELECT COUNT(*) as cnt FROM trade_articles')[0];
console.log(`TOTAL: ${total?.cnt}`);
