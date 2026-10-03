import * as cheerio from 'cheerio';

const UA = 'KINOTES-Tutorial-Tools/1.0 (+https://vercel.app; respectful font discovery proxy)';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.status(400).json({ error: 'Masukkan minimal 2 karakter.' });
  if (q.length > 80) return res.status(400).json({ error: 'Kata kunci terlalu panjang.' });

  try {
    const url = `https://www.dafont.com/search.php?q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    if (!r.ok) throw new Error(`Source returned ${r.status}`);
    const html = await r.text();
    const $ = cheerio.load(html);
    const items = [];
    const seen = new Set();

    $('a[href*=".font"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const match = href.match(/\/([^/?#]+)\.font(?:\?|$)/i);
      if (!match) return;
      const slug = match[1];
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      items.push({
        name: text || slug.replace(/[-_]/g, ' '),
        slug,
        pageUrl: `https://www.dafont.com/${slug}.font`,
        downloadUrl: `https://dl.dafont.com/dl/?f=${encodeURIComponent(slug)}`
      });
    });

    return res.status(200).json({ query: q, count: items.slice(0, 36).length, items: items.slice(0, 36) });
  } catch (e) {
    return res.status(502).json({ error: 'Tidak bisa mengambil hasil DaFont saat ini.', detail: e.message });
  }
}
