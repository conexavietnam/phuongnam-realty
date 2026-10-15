// Checks the Vietnamese number notation helpers (src/utils/numberFormat.ts) with fixed vectors.
// Usage: node scripts/check-numbers.mjs
import * as n from '../src/utils/numberFormat.ts';

let total = 0;
let failed = 0;
const expect = (name, want, got) => {
  total += 1;
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    failed += 1;
    console.error(`FAIL ${name}\n  want: ${JSON.stringify(want)}\n  got:  ${JSON.stringify(got)}`);
  }
};

// formatNumber(value, decimals)
[
  [3500000000, 0, '3.500.000.000'],
  [0, 0, '0'],
  [999, 0, '999'],
  [1000, 0, '1.000'],
  [85.5, 2, '85,5'],
  [85.5, 0, '86'],
  [3.25, 3, '3,25'],
  [1234567.891, 2, '1.234.567,89'],
  [null, 0, ''],
  [undefined, 2, ''],
  [-5, 0, ''],
  [Number.NaN, 0, ''],
].forEach(([value, decimals, want], i) => expect(`formatNumber #${i}`, want, n.formatNumber(value, decimals)));

// parseNumber(display) (strict Vietnamese format)
[
  ['3.500.000.000', 3500000000],
  ['85,5', 85.5],
  ['3,', 3],
  ['', null],
  [',', null],
].forEach(([text, want], i) => expect(`parseNumber #${i}`, want, n.parseNumber(text)));

// parsePasted(text, decimals) -> edit string
[
  ['3.500.000.000', 0, '3500000000'],
  ['3500000000', 0, '3500000000'],
  ['3,5', 2, '3,5'],
  ['3.5', 2, '3,5'],
  ['3.500', 2, '3500'],
  ['3,500.5', 2, '3500,5'],
  ['3.500,25', 2, '3500,25'],
  ['1,234,567', 0, '1234567'],
  ['1 234 567 ₫', 0, '1234567'],
  ['3,456', 2, '3,46'],
  ['3,5 tỷ', 3, '3,5'],
  ['3,5', 0, '4'],
  ['0,5', 2, '0,5'],
  ['-12', 0, '12'],
  ['abc', 0, ''],
  ['', 2, ''],
  ['0009', 0, '9'],
  ['9,995', 2, '10'],
  ['1234567890123456', 0, ''],
].forEach(([text, decimals, want], i) => expect(`parsePasted #${i} ${JSON.stringify(text)}`, want, n.parsePasted(text, decimals)));

// Typing: oldDisplay, raw input with "|" marking the caret, decimals, max -> [display, caret in display] | null
const type = (oldDisplay, rawWithCaret, decimals = 0, max = undefined) => {
  const caret = rawWithCaret.indexOf('|');
  const raw = rawWithCaret.replace('|', '');
  const result = n.applyTyping(oldDisplay, raw, caret, decimals, max);
  if (!result) return null;
  const display = n.editToDisplay(result.edit);
  return [display, n.caretInDisplay(display, result.caret)];
};
[
  ['', '3|', 0, undefined, ['3', 1]],
  ['350', '3500|', 0, undefined, ['3.500', 5]],
  ['3.500', '3.500.|', 0, undefined, ['3.500', 5]],
  ['3.500', '3.500,|', 0, undefined, ['3.500', 5]],
  ['3.500', '39|.500', 0, undefined, ['39.500', 2]],
  ['500', '1|500', 0, undefined, ['1.500', 1]],
  ['3.500', '3|500', 0, undefined, ['3.500', 1]],
  ['35.000', '3|.000', 0, undefined, ['3.000', 1]],
  ['3.500.000', '3.500.00|', 0, undefined, ['350.000', 7]],
  ['999', '9999|', 0, undefined, ['9.999', 5]],
  ['', '0|', 0, undefined, ['0', 1]],
  ['0', '05|', 0, undefined, ['5', 1]],
  ['57', '0|57', 0, undefined, ['57', 0]],
  ['', '3.500.000.000|', 0, undefined, ['3.500.000.000', 13]],
  ['', '3|a', 0, undefined, ['3', 1]],
  ['3', '3x|', 0, undefined, ['3', 1]],
  ['3', '3,|', 2, undefined, ['3,', 2]],
  ['3,', '3,5|', 2, undefined, ['3,5', 3]],
  ['3,5', '3,55|', 2, undefined, ['3,55', 4]],
  ['3,55', '3,555|', 2, undefined, ['3,55', 4]],
  ['3', '3.|', 2, undefined, ['3,', 2]],
  ['3,5', '3,5,|', 2, undefined, ['3,5', 3]],
  ['3,5', '3.|,5', 2, undefined, ['3,5', 1]],
  ['', ',|', 2, undefined, ['0,', 2]],
  ['', '3,5|', 2, undefined, ['3,5', 3]],
  ['', '3.500|', 2, undefined, ['3.500', 5]],
  ['99', '999|', 0, 500, null],
  ['123456789012345', '1234567890123456|', 0, undefined, null],
  ['1.000', '1.00|', 0, undefined, ['100', 3]],
].forEach(([old, raw, decimals, max, want], i) => expect(`typing #${i} ${JSON.stringify(old)} -> ${raw}`, want, type(old, raw, decimals, max)));

// Money reading and short labels
[
  [3500000000, '3,5 tỷ đồng'],
  [850000000, '850 triệu đồng'],
  [1250000000, '1,25 tỷ đồng'],
  [3256000000, '3,256 tỷ đồng'],
  [3256700000, '3 tỷ 256 triệu 700 nghìn đồng'],
  [3000000005, '3 tỷ 5 đồng'],
  [12500000, '12,5 triệu đồng'],
  [15000000, '15 triệu đồng'],
  [1500500, '1 triệu 500 nghìn 500 đồng'],
  [500000, '500 nghìn đồng'],
  [250500, '250.500 đồng'],
  [999, '999 đồng'],
  [18000000000, '18 tỷ đồng'],
  [1000000000000, '1.000 tỷ đồng'],
  [0, ''],
  [-1, ''],
].forEach(([value, want], i) => expect(`formatVndWords #${i} ${value}`, want, n.formatVndWords(value)));
expect('formatBillionWords 0.85', '850 triệu đồng', n.formatBillionWords(0.85));
expect('formatBillionWords 4.5', '4,5 tỷ đồng', n.formatBillionWords(4.5));
expect('formatPriceShort 3.5 tỷ', '3,5 tỷ', n.formatPriceShort(3500000000));
expect('formatPriceShort 850 triệu', '850 triệu', n.formatPriceShort(850000000));
expect('formatPriceShort 3.2567 tỷ', '3,257 tỷ', n.formatPriceShort(3256700000));
expect('formatBillionShort', '2,8 tỷ', n.formatBillionShort(2.8));
expect('formatVnd', '3.500.000.000 ₫', n.formatVnd(3500000000));
expect('formatVnd 0', '—', n.formatVnd(0));
expect('formatBillion', '4,5 tỷ', n.formatBillion(4.5));
expect('formatArea', '85,5 m²', n.formatArea(85.5));
expect('formatArea 1200', '1.200 m²', n.formatArea(1200));

// Suspicious magnitudes
[
  ['vnd', 500000, true],
  ['vnd', 1000000, false],
  ['vnd', 1e12, false],
  ['vnd', 1.5e12, true],
  ['vnd', 0, false],
  ['vnd', null, false],
  ['billion', 1000, false],
  ['billion', 1500, true],
  ['billion', 0.0005, true],
  ['billion', 0, false],
  ['area', 100000, false],
  ['area', 100001, true],
].forEach(([kind, value, warn], i) => expect(`magnitudeWarning #${i} ${kind} ${value}`, warn, n.magnitudeWarning(kind, value) !== null));

console.log(`number vectors: ${total - failed}/${total} passed`);
process.exit(failed === 0 ? 0 : 1);
