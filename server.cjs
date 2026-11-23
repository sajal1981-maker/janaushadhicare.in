#!/usr/bin/env node
/**
 * server.cjs — serves the shop website and the brand→salt lookup API.
 *
 *   "$ABACUSAI_BOT_NODE" server.cjs [port]
 *
 * Pages are static files from this folder; one extra route:
 *   GET /api/salt-lookup?q=dolo%20650          → search Tata 1mg for the brand
 *   GET /api/salt-lookup?url=/drugs/...        → read that medicine's salt composition
 *
 * The lookup has to run here, on the shop's own computer: 1mg does not send CORS
 * headers, so a browser on another origin cannot call it directly.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 8090);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const ONEMG = 'https://www.1mg.com';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

const stripTags = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function saltsFromHtml(html) {
  let m = html.match(/"salt_composition"\s*:\s*\{[^}]*?"display_text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) m = html.match(/"composition"\s*:\s*\{[^{}]*?"displayText"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) return '';
  const raw = m[1].replace(/\\"/g, '"').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>');
  return stripTags(raw);
}

async function fetchText(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en;q=0.9' }, signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}

async function lookup(q, url) {
  if (url) {
    if (!url.startsWith('/drugs/')) return { status: 'bad' };
    const html = await fetchText(ONEMG + url);
    let brand = '';
    const tw = html.match(/<meta name="twitter:title" content="([^"]+)"/) || html.match(/<title>([^<|]+)/);
    if (tw) brand = tw[1].replace(/\s*[:|].*$/, '').replace(/^Buy\s+/i, '').replace(/\s+Online$/i, '').trim();
    return { status: 'ok', salt: saltsFromHtml(html), brand, brandUrl: ONEMG + url };
  }
  const api = `${ONEMG}/pwa-api/api/v4/search/all?q=${encodeURIComponent(q)}&per_page=8&page=1&types=sku`;
  const j = JSON.parse(await fetchText(api));
  const list = ((j.data && j.data.search_results) || []).filter(r => r.type === 'drug' && r.url && r.name);
  if (!list.length) return { status: 'none' };
  if (list.length === 1) {
    const html = await fetchText(ONEMG + list[0].url);
    return { status: 'ok', salt: saltsFromHtml(html), brand: list[0].name, brandUrl: ONEMG + list[0].url };
  }
  return { status: 'pick', options: list.slice(0, 6).map(r => ({ name: r.name, url: r.url })) };
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api/salt-lookup') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const q = (u.searchParams.get('q') || '').trim();
      const url = (u.searchParams.get('url') || '').trim();
      if (!q && !url) { res.end(JSON.stringify({ status: 'bad' })); return; }
      const out = await lookup(q, url);
      res.end(JSON.stringify(out));
    } catch (e) {
      res.statusCode = 502;
      res.end(JSON.stringify({ status: 'error', message: String(e.message || e) }));
    }
    return;
  }

  let p = decodeURIComponent(u.pathname);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; res.end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', path.extname(file) === '.html' ? 'no-store' : 'public, max-age=300');
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`Shop site + salt lookup on http://127.0.0.1:${PORT}`));
