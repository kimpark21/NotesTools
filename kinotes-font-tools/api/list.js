import * as cheerio from 'cheerio';

const UA = 'KINOTES-Tutorial-Tools/2.0 (+font discovery; user initiated)';

function normalize($, href, text) {
  const match = String(href || '').match(/\/([^/?#]+)\.font(?:\?|$)/i);
  if (!match) return null;
  const slug = match[1];
  if (!slug || slug === 'search') return null;
  return {
    name: String(text || slug).replace(/\s+/g, ' ').trim() || slug.replace(/[-_]/g, ' '),
    slug,
    pageUrl: `https://www.dafont.com/${slug}.font`,
    downloadUrl: `https://dl.dafont.com/dl/?f=${encodeURIComponent(slug)}`
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const requested = Math.max(1, Math.min(500, Number.parseInt(req.query.count || '100', 10) || 100));
  const source = String(req.query.source || 'new').toLowerCase() === 'top' ? 'top' : 'new';
  const paths = source === 'top' ? ['/top.php'] : ['/new.php', '/top.php'];

  try {
    const items = [];
    const seen = new Set();
    for (const path of paths) {
      const r = await fetch(`https://www.dafont.com${path}`, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
        redirect: 'follow'
      });
      if (!r.ok) continue;
      const html = await r.text();
      const $ = cheerio.load(html);
      $('a[href*=".font"]').each((_, el) => {
        const item = normalize($, $(el).attr('href'), $(el).text());
        if (!item || seen.has(item.slug)) return;
        seen.add(item.slug);
        items.push(item);
      });
      if (items.length >= requested) break;
    }

    if (!items.length) throw new Error('DaFont tidak mengembalikan daftar font.');
    return res.status(200).json({ count: Math.min(requested, items.length), requested, source, items: items.slice(0, requested) });
  } catch (e) {
    return res.status(502).json({
      error: 'Daftar font belum bisa diambil dari DaFont. Coba beberapa saat lagi.',
      detail: e.message
    });
  }
}
