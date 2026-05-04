process.env.BROWSER_MODE = 'local';

import * as cheerio from 'cheerio';

async function run() {
  const { newPage } = await import('../lib/browser');

  // ── Realscreen: see what the page actually contains ──
  console.log('\n── Realscreen: page content check ──');
  const rsPage = await newPage();
  try {
    await rsPage.goto('https://realscreen.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    const rsHtml = await rsPage.content();
    const rs$ = cheerio.load(rsHtml);
    console.log('Title:', rs$('title').text().trim());
    console.log('Body text (first 400):', rs$('body').text().replace(/\s+/g, ' ').trim().slice(0, 400));
    // Try every anchor on the page
    const allLinks = rs$('a[href]').filter((_, el) => {
      const text = rs$(el).text().trim();
      return text.length > 15 && rs$(el).attr('href')?.includes('realscreen.com');
    });
    console.log(`\nAll internal links (${allLinks.length}):`);
    allLinks.slice(0, 10).each((_, el) => {
      console.log(`  "${rs$(el).text().trim().slice(0, 80)}" → ${rs$(el).attr('href')?.slice(0, 70)}`);
    });
  } finally {
    await rsPage.close();
  }

  // ── NextTV: find the headline element inside .article-link ──
  console.log('\n── NextTV: .article-link child structure ──');
  const ntPage = await newPage();
  try {
    await ntPage.goto('https://www.nexttv.com/news', { waitUntil: 'networkidle2', timeout: 30000 });
    const ntHtml = await ntPage.content();
    const nt$ = cheerio.load(ntHtml);
    console.log('Title:', nt$('title').text().trim());

    // Inspect the first 3 .article-link elements for child structure
    nt$('.article-link').slice(0, 3).each((i, card) => {
      console.log(`\nCard ${i + 1} href: ${nt$(card).attr('href')}`);
      nt$(card).find('*').each((_, child) => {
        const tag = (child as any).tagName;
        const cls = nt$(child).attr('class') || '';
        const text = nt$(child).text().trim().slice(0, 80);
        if (text && !text.includes('\n') && text.length > 5) {
          console.log(`  <${tag} class="${cls}"> ${text}`);
        }
      });
    });

    // Also check article-name specifically
    console.log(`\n.article-name count: ${nt$('.article-name').length}`);
    nt$('.article-name').slice(0, 3).each((_, el) => {
      console.log(`  "${nt$(el).text().trim().slice(0, 80)}"`);
    });
  } finally {
    await ntPage.close();
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
