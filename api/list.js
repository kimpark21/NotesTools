import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0 Safari/537.36 KINOTES-TUTORIAL-TOOLS';

function normalize(href, text) {
  const raw = String(href || '').trim();
  const match = raw.match(/(?:^|\/)\/?([^/?#]+)\.font(?:[?#]|$)/i);
  if (!match) return null;
  const slug = match[1];
  if (!slug || /^(new|top|search)$/i.test(slug)) return null;
  return {
    name: String(text || slug).replace(/\s+/g, ' ').trim() || slug.replace(/[-_]/g, ' '),
    slug,
    pageUrl: `https://www.dafont.com/${slug}.font`,
    downloadUrl: `https://dl.dafont.com/dl/?f=${encodeURIComponent(slug)}`
  };
}

async function getPage(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      'Referer': 'https://www.dafont.com/'
    },
    redirect: 'follow'
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const requested = Math.max(1, Math.min(500, Number.parseInt(req.query.count || '100', 10) || 100));
  const source = String(req.query.source || 'new').toLowerCase() === 'top' ? 'top' : 'new';
  const urls = source === 'top'
    ? [
        `https://www.dafont.com/top.php?fpp=200`,
        `https://www.dafont.com/top.php?fpp=100`,
        `https://www.dafont.com/top.php`
      ]
    : [
        `https://www.dafont.com/new.font?fpp=200`,
        `https://www.dafont.com/new.font?fpp=100`,
        `https://www.dafont.com/new.php`
      ];

  const items = [];
  const seen = new Set();
  const errors = [];

  for (const url of urls) {
    if (items.length >= requested) break;
    try {
      const html = await getPage(url);
      const $ = cheerio.load(html);

      $('a[href]').each((_, el) => {
        if (items.length >= requested) return;
        const item = normalize($(el).attr('href'), $(el).text());
        if (!item || seen.has(item.slug)) return;
        seen.add(item.slug);
        items.push(item);
      });
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }

  if (!items.length) {
    return res.status(502).json({
      error: 'DaFont tidak mengembalikan daftar font ke server. Coba lagi beberapa saat lagi atau gunakan mode Link Manual.',
      code: 'DAFONT_LIST_UNAVAILABLE',
      detail: errors.join(' | ')
    });
  }

  return res.status(200).json({
    count: Math.min(requested, items.length),
    requested,
    source,
    items: items.slice(0, requested),
    partial: items.length < requested,
    message: items.length < requested ? `DaFont hanya mengembalikan ${items.length} font pada sesi ini.` : null
  });
}
