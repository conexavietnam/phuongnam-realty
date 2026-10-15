// Checks the pure helpers behind news (src/utils/newsMeta.ts) and the menu (src/utils/menuConfig.ts).
// The link vectors are shared with the PHP side (server/tests/menu-vectors.json, run by server/tests/smoke.sh).
// Usage: node scripts/check-news-menu.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as news from '../src/utils/newsMeta.ts';
import * as menu from '../src/utils/menuConfig.ts';
import { nextOldSlugs } from '../src/utils/slugHistory.ts';

const vectors = JSON.parse(readFileSync(fileURLToPath(new URL('../server/tests/menu-vectors.json', import.meta.url)), 'utf8'));

let total = 0;
let failed = 0;
const expect = (name, want, got) => {
  total += 1;
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    failed += 1;
    console.error(`FAIL ${name}\n  want: ${JSON.stringify(want)}\n  got:  ${JSON.stringify(got)}`);
  }
};

// Menu links (shared with PHP)
vectors.links.forEach(([url, ok]) => expect(`classifyMenuUrl ${JSON.stringify(url)}`, ok, menu.classifyMenuUrl(url) !== null));
expect('link kinds', ['internal', 'external', 'mail', 'tel'], ['/x', 'https://a.b', 'mailto:a@b.c', 'tel:123'].map(menu.classifyMenuUrl));
expect('link of 500 chars', true, menu.classifyMenuUrl(`/${'a'.repeat(499)}`) !== null);
expect('link of 501 chars', false, menu.classifyMenuUrl(`/${'a'.repeat(500)}`) !== null);

// renderableNav: legacy shape, hidden, invalid, one level only, ids
const legacy = [{ label: 'Trang chủ', path: '/', exact: true }, { label: 'Dự án', path: '/du-an' }];
const nav = menu.renderableNav(legacy);
expect('legacy shape renders', ['Trang chủ', 'Dự án'], nav.map((i) => i.label));
expect('legacy ids are generated', ['item-0', 'item-1'], nav.map((i) => i.id));
expect('legacy exact is kept', [true, false], nav.map((i) => i.exact));
const rich = menu.renderableNav([
  { id: 'a', label: ' A ', path: '/a', children: [{ id: 'a1', label: 'A1', path: '/a/1' }, { label: 'hidden', path: '/a/2', visible: false }, { label: 'bad', path: 'javascript:alert(1)' }, { label: 'ext', path: 'https://x.test' }] },
  { id: 'b', label: 'B', path: '/b', visible: false },
  { id: 'c', label: 'C', path: 'javascript:alert(1)' },
  { id: 'd', label: '', path: '/d' },
  { id: 'e', label: 'E', path: '/e', children: [{ label: 'nested', path: '/e/1', children: [{ label: 'deeper', path: '/e/1/1' }] }] },
]);
expect('hidden and invalid items are skipped', ['a', 'e'], rich.map((i) => i.id));
expect('label is trimmed', 'A', rich[0].label);
expect('hidden and invalid children are skipped', ['a1', 'a-3'], rich[0].children.map((c) => c.id));
expect('external children open in a new tab', [false, true], rich[0].children.map((c) => c.newTab));
expect('grandchildren are never rendered', [], rich[1].children.flatMap((c) => c.children ?? []));
expect('limit of 10 header items', 10, menu.renderableNav(Array.from({ length: 14 }, (_, i) => ({ label: `M${i}`, path: `/m${i}` }))).length);
expect('limit of 12 children', 12, menu.renderableNav([{ label: 'A', path: '/', children: Array.from({ length: 20 }, (_, i) => ({ label: `K${i}`, path: `/k${i}` })) }])[0].children.length);
expect('missing menu', [], menu.renderableNav(undefined));

// Bottom bar
const bottom = menu.renderableBottom([
  { label: 'A', path: '/', icon: 'Home' },
  { label: 'B', path: '/b', icon: 'Skull' },
  { label: 'C', path: '/c', icon: 'Phone', visible: false },
  { label: 'D', path: 'data:x', icon: 'Mail' },
]);
expect('bottom bar skips hidden/invalid and falls back to Home for unknown icons', [['A', 'Home'], ['B', 'Home']], bottom.map((i) => [i.label, i.icon]));
expect('limit of 5 bottom items', 5, menu.renderableBottom(Array.from({ length: 8 }, (_, i) => ({ label: `B${i}`, path: `/b${i}`, icon: 'Home' }))).length);

// Active state
const products = menu.renderableNav([{ label: 'Tin', path: '/tin-tuc', children: [{ label: 'TT', path: '/tin-tuc/danh-muc/thi-truong' }] }, { label: 'Home', path: '/' }])[0];
const home = menu.renderableNav([{ label: 'Home', path: '/' }])[0];
expect('parent is active on its own page', true, menu.isNavItemActive('/tin-tuc', products));
expect('parent is active on a child page of its own path', true, menu.isNavItemActive('/tin-tuc/bai-viet', products));
expect('parent is active when only a child path matches', true, menu.isNavItemActive('/tin-tuc/danh-muc/thi-truong', products));
expect('parent is not active elsewhere', false, menu.isNavItemActive('/du-an', products));
expect('similar prefix is not active', false, menu.isNavItemActive('/tin-tuc-khac', products));
expect('home is active only on /', [true, false], [menu.isNavItemActive('/', home), menu.isNavItemActive('/du-an', home)]);
expect('trailing slash is ignored', true, menu.isNavItemActive('/tin-tuc/', products));
expect('external links are never active', false, menu.isLinkActive('/x', { path: 'https://x.test/x', kind: 'external', exact: false }));
expect('path with a query string', true, menu.isLinkActive('/chuyen-nhuong', { path: '/chuyen-nhuong?type=can-ho', kind: 'internal', exact: false }));

// Editor messages
expect('empty label', 'M: chưa có tên hiển thị.', menu.linkProblem({ label: ' ', path: '/' }, 'M'));
expect('long label', 'M: tên hiển thị tối đa 40 ký tự.', menu.linkProblem({ label: 'a'.repeat(41), path: '/' }, 'M'));
expect('empty path', 'M: chưa có đường dẫn.', menu.linkProblem({ label: 'a', path: '' }, 'M'));
expect('bad path starts with the message', true, menu.linkProblem({ label: 'a', path: 'javascript:x' }, 'M')?.startsWith('M: đường dẫn "javascript:x" không hợp lệ.'));
expect('good link', null, menu.linkProblem({ label: 'a', path: '/x' }, 'M'));

// News: reserved slug, conflicts
expect('reserved slug', [true, false], [news.isReservedNewsSlug('danh-muc'), news.isReservedNewsSlug('danh-muc-2')]);
expect('category path', '/tin-tuc/danh-muc/thi-truong', news.categoryPath('thi-truong'));
const existing = [{ id: 'n1', slug: 'a', oldSlugs: ['cu'] }, { id: 'n2', slug: 'b' }];
expect('slug conflict with a slug', true, news.newsSlugConflict(existing, 'a', 'n2') !== null);
expect('slug conflict with an old slug', true, news.newsSlugConflict(existing, 'cu', 'n2') !== null);
expect('own slug is no conflict', null, news.newsSlugConflict(existing, 'a', 'n1'));
expect('reserved slug conflict', true, news.newsSlugConflict(existing, 'danh-muc', 'n1')?.includes('giữ riêng'));

// News: categories
const categories = [{ slug: 'b', label: 'Bê', order: 2 }, { slug: 'a', label: 'A', order: 2 }, { slug: 'c', label: 'C', order: 1 }];
expect('categories sort by order then label', ['c', 'a', 'b'], news.sortCategories(categories).map((c) => c.slug));
expect('label comes from the list', 'Bê', news.categoryLabelFor({ category: 'b', categoryLabel: 'Cũ' }, categories));
expect('label falls back to the stored one', 'Cũ', news.categoryLabelFor({ category: 'x', categoryLabel: 'Cũ' }, categories));
expect('label falls back to the code', 'x', news.categoryLabelFor({ category: 'x', categoryLabel: '' }, categories));
expect('counts', { a: 2, b: 1 }, news.countByCategory([{ category: 'a' }, { category: 'b' }, { category: 'a' }]));
expect('authors', ['An', 'Bình'], news.usedAuthors([{ author: 'Bình' }, { author: ' An ' }, { author: '' }, { author: 'Bình' }, {}]));

// Category slug history (same helper as articles)
expect('rename keeps the previous slug', ['a'], nextOldSlugs({ slug: 'a' }, 'b'));
expect('rename keeps earlier history', ['x', 'a'], nextOldSlugs({ slug: 'a', oldSlugs: ['x'] }, 'b'));
expect('renaming back drops the reused slug from the history', ['x', 'b'], nextOldSlugs({ slug: 'b', oldSlugs: ['x', 'a'] }, 'a'));
expect('no rename, no history', undefined, nextOldSlugs({ slug: 'a' }, 'a'));
expect('new category has no history', undefined, nextOldSlugs(undefined, 'a'));
expect('history is capped at 10', ['s2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'a'], nextOldSlugs({ slug: 'a', oldSlugs: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'] }, 'b'));

// News: reading time (200 words per minute, at least 1)
const words = (n) => Array.from({ length: n }, (_, i) => `từ${i}`).join(' ');
expect('empty text reads 1 minute', 1, news.readTimeMinutes(''));
expect('199 words', 1, news.readTimeMinutes(`<p>${words(199)}</p>`));
expect('200 words', 1, news.readTimeMinutes(`<p>${words(200)}</p>`));
expect('201 words', 2, news.readTimeMinutes(`<p>${words(201)}</p>`));
expect('1000 words', 5, news.readTimeMinutes(`<p>${words(1000)}</p>`));
expect('tags are not words', 1, news.readTimeMinutes(`<div ${words(500)}><img src="x"></div>`));
expect('scripts are not words', 0, news.plainWords(`<script>${words(300)}</script>`).length);
expect('entities and punctuation are not words', ['A', 'B'], news.plainWords('<p>A&nbsp;&amp;&nbsp;B&nbsp;—&nbsp;…</p>'));
expect('label', '3 phút đọc', news.readTimeLabel(3));
expect('label to minutes', [5, null, 12], ['5 phút đọc', 'khoảng', '12'].map(news.readTimeToMinutes));

// News: dates in Vietnam time (UTC+7)
expect('ISO to local input', '2025-01-08T16:00', news.toDateTimeLocal('2025-01-08T09:00:00Z'));
expect('ISO crossing midnight', '2025-03-04T00:30', news.toDateTimeLocal('2025-03-03T17:30:00.000Z'));
expect('date-only is midnight in Vietnam', '2025-01-08T00:00', news.toDateTimeLocal('2025-01-08'));
expect('garbage', '', news.toDateTimeLocal('not a date'));
expect('local input to ISO', '2025-01-08T09:00:00.000Z', news.fromDateTimeLocal('2025-01-08T16:00'));
expect('local input just after midnight', '2025-03-03T17:30:00.000Z', news.fromDateTimeLocal('2025-03-04T00:30'));
expect('invalid local input', null, news.fromDateTimeLocal('2025-01-08'));
expect('round trip', '2026-10-15T13:45', news.toDateTimeLocal(news.fromDateTimeLocal('2026-10-15T13:45')));
expect('format date', '08/01/2025', news.formatNewsDate('2025-01-08T09:00:00Z'));
expect('format date across midnight', '04/03/2025', news.formatNewsDate('2025-03-03T17:30:00Z'));
expect('format date-only', '08/01/2025', news.formatNewsDate('2025-01-08'));
expect('format date-time', '04/03/2025 00:30', news.formatNewsDateTime('2025-03-03T17:30:00Z'));
expect('format garbage is kept', 'hôm qua', news.formatNewsDate('hôm qua'));

console.log(`news/menu vectors: ${total - failed}/${total} passed`);
process.exit(failed === 0 ? 0 : 1);
