// Checks the pure helpers behind the single phone/Zalo number (src/utils/contact.ts).
// Usage: node scripts/check-contact.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as c from '../src/utils/contact.ts';

const vectors = JSON.parse(readFileSync(fileURLToPath(new URL('../server/tests/phone-vectors.json', import.meta.url)), 'utf8'));

let total = 0;
let failed = 0;
const expect = (name, want, got) => {
  total += 1;
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    failed += 1;
    console.error(`FAIL ${name}\n  want: ${JSON.stringify(want)}\n  got:  ${JSON.stringify(got)}`);
  }
};

const company = (hotline, zalo = '') => ({ hotline, social: { zalo } });

for (const [name, text, digits, usable, tel] of [
  ['spaced', '0931 1234 16', '0931123416', true, 'tel:0931123416'],
  ['plain', '0931123416', '0931123416', true, 'tel:0931123416'],
  ['plus84', '+84 931 123 416', '84931123416', true, 'tel:0931123416'],
  ['0084', '0084931123416', '0084931123416', true, 'tel:0931123416'],
  ['dots', '0931.123.416', '0931123416', true, 'tel:0931123416'],
  ['too short', '12345', '12345', false, '#'],
  ['bare 9 digits', '931123416', '931123416', false, '#'],
  ['too long', '0931123416789', '0931123416789', false, '#'],
  ['junk', 'abc', '', false, '#'],
  ['empty', '', '', false, '#'],
]) {
  expect(`phoneDigits ${name}`, digits, c.phoneDigits(text));
  expect(`isUsablePhone ${name}`, usable, c.isUsablePhone(text));
  expect(`telHref ${name}`, tel, c.telHref(text));
}
expect('phoneDigits null', '', c.phoneDigits(null));

// Shared with PHP (pn_phone_local): the domestic form, or '' when unusable.
for (const [text, local] of vectors.phones) {
  expect(`shared vector ${JSON.stringify(text)}`, local, c.isUsablePhone(text) ? c.localDigits(text) : '');
}

expect('zalo from hotline', 'https://zalo.me/0931123416', c.zaloHref(company('0931 1234 16')));
expect('zalo from +84', 'https://zalo.me/0931123416', c.zaloHref(company('+84 931 123 416')));
expect('zalo custom zalo.me', 'https://zalo.me/g/abc', c.zaloHref(company('0931123416', 'https://zalo.me/g/abc')));
expect('zalo custom chat.zalo.me', 'https://chat.zalo.me/?phone=1', c.zaloHref(company('0931123416', 'https://chat.zalo.me/?phone=1')));
expect('zalo "#"', 'https://zalo.me/0931123416', c.zaloHref(company('0931123416', '#')));
expect('zalo javascript:', 'https://zalo.me/0931123416', c.zaloHref(company('0931123416', 'javascript:alert(1)')));
expect('zalo foreign host', 'https://zalo.me/0931123416', c.zaloHref(company('0931123416', 'https://evil.example/zalo.me/1')));
expect('zalo lookalike host', 'https://zalo.me/0931123416', c.zaloHref(company('0931123416', 'https://zalo.me.evil.example/1')));
expect('zalo http', 'https://zalo.me/0931123416', c.zaloHref(company('0931123416', 'http://zalo.me/1')));
expect('zalo bad hotline', '#', c.zaloHref(company('abc')));
expect('isValidZaloUrl', [true, false, false], [c.isValidZaloUrl('https://zalo.me/0931123416'), c.isValidZaloUrl(''), c.isValidZaloUrl('https://zalo.me/"onclick=')]);

const co = company('0931 1234 16');
const home = { phone: '0931 1234 16', tel: 'tel:0931123416', zalo: 'https://zalo.me/0931123416', sms: 'sms:0931123416' };
expect('companyContact', home, c.companyContact(co));
expect('agent undefined', home, c.agentContact(undefined, co));
expect('agent demo 567', home, c.agentContact({ phone: '0901 234 567', zaloLink: 'https://zalo.me/0901234567' }, co));
expect('agent demo 568 +84', home, c.agentContact({ phone: '+84 901 234 568' }, co));
expect('agent empty', home, c.agentContact({ phone: '', zaloLink: '' }, co));
expect('agent junk phone', home, c.agentContact({ phone: 'abc' }, co));
expect('agent own', { phone: '0912 345 678', tel: 'tel:0912345678', zalo: 'https://zalo.me/0912345678', sms: 'sms:0912345678' }, c.agentContact({ phone: '0912 345 678', zaloLink: 'javascript:x' }, co));
expect('agent own + zalo', 'https://zalo.me/custom', c.agentContact({ phone: '0912 345 678', zaloLink: 'https://zalo.me/custom' }, co).zalo);
expect('agent same as hotline', home.tel, c.agentContact({ phone: '0931 123 416' }, co).tel);

console.log(`check-contact: ${total - failed}/${total} passed`);
process.exit(failed === 0 ? 0 : 1);
