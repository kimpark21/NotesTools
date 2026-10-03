const UA = 'KINOTES-Tutorial-Tools/1.0 (+https://vercel.app; user initiated download proxy)';

function isAllowed(url) {
  try {
    const u = new URL(url);
    return ['dl.dafont.com', 'www.dafont.com', 'dafont.com'].includes(u.hostname);
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const target = String(req.query.url || '');
  const name = String(req.query.name || 'font').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'font';
  if (!isAllowed(target)) return res.status(400).json({ error: 'URL sumber tidak diizinkan.' });

  try {
    const r = await fetch(target, { headers: { 'User-Agent': UA, 'Referer': 'https://www.dafont.com/' }, redirect: 'follow' });
    if (!r.ok) throw new Error(`Source returned ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 30 * 1024 * 1024) return res.status(413).json({ error: 'File terlalu besar.' });
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ error: 'Download gagal.', detail: e.message });
  }
}
