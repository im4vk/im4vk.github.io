// Fetches RSS/Atom feeds at build time and writes feeds.json.
// Runs in GitHub Actions (Node 20+, no dependencies). Edit the lists below.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const FEEDS = [
  // Advisories and official guidance
  { name: 'CISA Advisories',        kind: 'exploited', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
  { name: 'SANS ISC',               kind: 'exploited', url: 'https://isc.sans.edu/rssfeed.xml' },
  // Research blogs
  { name: 'Project Zero',           kind: 'research', url: 'https://googleprojectzero.blogspot.com/feeds/posts/default' },
  { name: 'Google Security Blog',   kind: 'research', url: 'https://security.googleblog.com/feeds/posts/default' },
  { name: 'PortSwigger Research',   kind: 'research', url: 'https://portswigger.net/research/rss' },
  { name: 'Trail of Bits',          kind: 'research', url: 'https://blog.trailofbits.com/feed/' },
  { name: 'Unit 42',                kind: 'research', url: 'https://unit42.paloaltonetworks.com/feed/' },
  { name: 'Check Point Research',   kind: 'research', url: 'https://research.checkpoint.com/feed/' },
  { name: 'Wiz Research',           kind: 'research', url: 'https://www.wiz.io/feed/rss.xml' },
  { name: 'The DFIR Report',        kind: 'research', url: 'https://thedfirreport.com/feed/' },
  // Commentary
  { name: 'Schneier on Security',   kind: 'research', url: 'https://www.schneier.com/feed/atom/' },
  // News
  { name: 'The Hacker News',        kind: 'news', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'Dark Reading',           kind: 'news', url: 'https://www.darkreading.com/rss.xml' },
  { name: 'Ars Technica Security',  kind: 'news', url: 'https://arstechnica.com/security/feed/' },
  { name: 'The Register Security',  kind: 'news', url: 'https://www.theregister.com/security/headlines.atom' },
];

const PER_FEED = 5;
const MAX_ITEMS = 80;
const MAX_AGE_DAYS = 30;   // only keep posts from the past month
// Titles matching this are dropped: podcasts, funding/product PR, events, off-topic posts.
const NOISE = /squid|stormcast|podcast|webinar|raises \$|funding|acquires|acquisition|black hat|conference|summit|survey|\bROI\b|weekly update|sponsored/i;
const cutoff = () => new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString();

const ent = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const strip = s => ent(
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '')
).replace(/\s+/g, ' ').trim();
const tag = (b, n) => {
  const m = b.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i'));
  return m ? m[1] : '';
};
const linkOf = b => {
  for (const m of b.matchAll(/<link\b([^>]*?)\/?>/gi)) {
    const href = m[1].match(/href=["']([^"']+)["']/i);
    const rel = m[1].match(/rel=["']([^"']+)["']/i);
    if (href && (!rel || rel[1] === 'alternate')) return ent(href[1]);
  }
  return strip(tag(b, 'link'));
};
const isHttp = u => /^https?:\/\//i.test(u);

export function parseFeed(xml, source) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  const out = [];
  for (const b of blocks) {
    const title = strip(tag(b, 'title'));
    const url = linkOf(b);
    const when = Date.parse(strip(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')));
    if (!title || !isHttp(url) || Number.isNaN(when)) continue;
    out.push({ title, url, source, date: new Date(when).toISOString() });
  }
  return out;
}

async function get(url) {
  const r = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (personal-site feed builder)', accept: 'application/rss+xml, application/atom+xml, text/xml, */*' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

async function main() {
  const items = [];
  await Promise.all([
    ...FEEDS.map(async f => {
      try {
        const got = parseFeed(await get(f.url), f.name).filter(i => i.date >= cutoff() && !NOISE.test(i.title)).map(i => ({ ...i, kind: f.kind })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, PER_FEED);
        items.push(...got);
        console.log(`ok   ${f.name}: ${got.length}`);
      } catch (e) { console.warn(`skip ${f.name}: ${e.message}`); }
    }),
  ]);
  items.sort((a, b) => b.date.localeCompare(a.date));
  await writeFile('feeds.json', JSON.stringify({ updated: new Date().toISOString(), items: items.slice(0, MAX_ITEMS) }, null, 1));
  console.log(`wrote feeds.json: ${Math.min(items.length, MAX_ITEMS)} items`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
