// Checks the TypeScript SEO derivation (src/utils/seo.ts) against the vectors shared with the PHP side
// (server/tests/seo-vectors.json, run by server/tests/smoke.sh). Usage: node scripts/check-seo.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as seo from '../src/utils/seo.ts';

const vectors = JSON.parse(
  readFileSync(fileURLToPath(new URL('../server/tests/seo-vectors.json', import.meta.url)), 'utf8'),
);

let total = 0;
let failed = 0;
const expect = (name, want, got) => {
  total += 1;
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    failed += 1;
    console.error(`FAIL ${name}\n  want: ${JSON.stringify(want)}\n  got:  ${JSON.stringify(got)}`);
  }
};
const pick = (p) => ({
  title: p.title, description: p.description, keywords: p.keywords, robots: p.robots,
  image: p.image, ogType: p.ogType, path: p.path,
});

vectors.plainText.forEach(([input, want], i) => expect(`plainText #${i}`, want, seo.plainText(input)));
vectors.snippet.forEach(([input, want], i) => expect(`snippet #${i}`, want, seo.snippet(input)));
vectors.usableImage.forEach(([input, want], i) => expect(`usableImage #${i}`, want, seo.usableImage(input)));
vectors.keywords.forEach(([input, want], i) => expect(`keywords #${i}`, want, seo.cleanKeywords(input)));
vectors.items.forEach((c, i) => {
  const page = seo.itemSeo(c.kind, c.item, seo.siteSeo(c.company), c.path);
  expect(`items #${i} ${c.name}`, c.expect, pick(page));
});
vectors.pages.forEach((c, i) => {
  const site = seo.siteSeo(c.company);
  const page = c.page === 'home' ? seo.homeSeo(site) : seo.staticPageSeo(c.page, c.path, site);
  expect(`pages #${i} ${c.page}`, c.expect, pick(page));
});

console.log(`seo vectors: ${total - failed}/${total} passed`);
process.exit(failed === 0 ? 0 : 1);
