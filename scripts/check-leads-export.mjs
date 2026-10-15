// Checks the leads Excel export: the row model (src/utils/leadsExportModel.ts) with fixed vectors, then writes
// a real .xlsx with the exporter so scripts/check-leads-export.py can read it back with openpyxl.
// Usage: node scripts/check-leads-export.mjs [output.xlsx]
import { writeFileSync } from 'node:fs';
import * as m from '../src/utils/leadsExportModel.ts';
import { buildLeadsWorkbook } from '../src/utils/leadsExportXlsx.ts';

let total = 0;
let failed = 0;
const expect = (name, want, got) => {
  total += 1;
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    failed += 1;
    console.error(`FAIL ${name}\n  want: ${JSON.stringify(want)}\n  got:  ${JSON.stringify(got)}`);
  }
};

const ctx = {
  purposeLabel: (p) => (p === 'ban' ? 'Cần bán' : p === 'cho-thue' ? 'Cho thuê' : 'Tư vấn'),
  regionLabel: (c) => ({ 'phu-quoc': 'Phú Quốc' })[c] ?? c,
  typeLabel: (c) => ({ 'biet-thu': 'Biệt thự' })[c] ?? c,
  priceLabel: (c) => ({ '5-10': '5 - 10 tỷ' })[c] ?? c,
  statusLabel: (l) => ({ new: 'Mới nhận', closed: 'Đã hoàn thành' })[l.status] ?? l.status,
  listingLabel: (id) => (id === 'consign-1' ? 'Biệt thự - Phú Quốc' : id),
};

const LONG_NOTE = `Ghi chú rất dài. ${'Đặng Quốc Việt muốn bán gấp căn nhà. '.repeat(1000)}`;
const leads = [
  { id: 'l1', fullName: 'Nguyễn Thị Hương', phone: '0931123416', purpose: 'ban', region: 'phu-quoc', propertyType: 'biet-thu', priceRange: '5-10', note: 'Cần bán gấp 🏠🙂\nDòng hai', createdAt: '2026-10-15T07:30:00.000Z', status: 'new', source: 'consignment', internalNote: 'Gọi lại chiều', consignmentId: 'consign-1' },
  { id: 'l2', fullName: 'Đặng Quốc Việt', phone: '+84 931 123 416', purpose: 'tu-van', note: '[Chủ đề: Tư vấn dự án BĐS] [Email: viet@example.com] - Tôi muốn xem nhà', createdAt: '2026-10-14T18:05:00.000Z', status: 'contacted', source: 'contact' },
  { id: 'l3', fullName: '=HYPERLINK("http://evil.example","Bấm vào")', phone: '=1+1', purpose: 'cho-thue', note: '+cmd|\' /C calc\'!A0', createdAt: '2026-10-14T16:59:59.000Z', status: 'completed', source: 'consignment', internalNote: '@SUM(1,1)' },
  { id: 'l4', fullName: '-2+3', phone: '0987654321', purpose: 'ban', note: LONG_NOTE, createdAt: 'not-a-date', status: 'cancelled', source: 'consignment', consignmentId: 'gone-id' },
  { id: 'l5', fullName: 'Trần Văn Ân', phone: '0123456789', purpose: 'tu-van', note: '[Chủ đề: Hỏi giá] [Email: N/A] - Xin báo giá', createdAt: '2026-01-01T00:00:00.000Z', status: 'closed', source: 'contact', region: 'khong-co', priceRange: '' },
  { id: 'l6', fullName: 'A\u0000B\u0007C', phone: '09', purpose: 'ban', createdAt: '2026-10-15T00:00:00.000Z', status: 'new', source: 'contact' },
];
// normalizeLead (src/utils/consignment.ts) maps legacy codes before display; mimic its result for the status label.
const legacy = { contacted: 'processing', completed: 'closed', cancelled: 'rejected' };
const ctxLegacy = { ...ctx, statusLabel: (l) => ({ new: 'Mới nhận', processing: 'Đang liên hệ', closed: 'Đã hoàn thành', rejected: 'Đã hủy' })[legacy[l.status] ?? l.status] };

const rows = m.buildExportRows(leads, ctxLegacy);
const r = (i) => rows[i];

expect('count', 6, rows.length);
expect('stt', [1, 2, 3, 4, 5, 6], rows.map((x) => x.index));
// 07:30Z = 14:30 GMT+7
expect('date GMT+7', '2026-10-15T14:30:00.000Z', r(0).createdAt.toISOString());
expect('date just before midnight GMT+7', '2026-10-14T23:59:59.000Z', r(2).createdAt.toISOString());
expect('invalid date -> null', null, r(3).createdAt);
expect('source consignment', 'Ký gửi', r(0).source);
expect('source contact', 'Liên hệ', r(1).source);
expect('diacritics name', 'Nguyễn Thị Hương', r(0).fullName);
expect('diacritics name 2', 'Đặng Quốc Việt', r(1).fullName);
expect('phone keeps leading 0', '0931123416', r(0).phone);
expect('phone keeps + and spaces', '+84 931 123 416', r(1).phone);
expect('labels', ['Phú Quốc', 'Biệt thự', '5 - 10 tỷ', 'Cần bán'], [r(0).region, r(0).propertyType, r(0).priceRange, r(0).purpose]);
expect('unknown code falls back to raw', 'khong-co', r(4).region);
expect('empty price stays empty', '', r(4).priceRange);
expect('emoji + newline kept', 'Cần bán gấp 🏠🙂\nDòng hai', r(0).note);
expect('contact note split', ['Tư vấn dự án BĐS', 'viet@example.com', 'Tôi muốn xem nhà'], [r(1).subject, r(1).email, r(1).note]);
expect('contact N/A email blank', ['Hỏi giá', '', 'Xin báo giá'], [r(4).subject, r(4).email, r(4).note]);
expect('consignment note not parsed', '', r(0).subject);
expect('formula text unchanged', '=HYPERLINK("http://evil.example","Bấm vào")', r(2).fullName);
expect('legacy status', ['Mới nhận', 'Đang liên hệ', 'Đã hoàn thành', 'Đã hủy'], [r(0).status, r(1).status, r(2).status, r(3).status]);
expect('internal note', 'Gọi lại chiều', r(0).internalNote);
expect('listing title', 'Biệt thự - Phú Quốc', r(0).listing);
expect('listing id fallback', 'gone-id', r(3).listing);
expect('missing fields -> empty', ['', '', '', ''], [r(5).region, r(5).propertyType, r(5).priceRange, r(5).internalNote]);
expect('xml-illegal chars stripped', 'ABC', r(5).fullName);
expect('long note truncated', m.MAX_CELL_LENGTH + 1, r(3).note.length);
expect('looksLikeFormula', [true, true, true, true, false, false], ['=a', '+a', '-a', '@a', 'a=', '0931'].map(m.looksLikeFormula));
expect('file name GMT+7', 'khach-hang-20261016-0030.xlsx', m.exportFileName(new Date('2026-10-15T17:30:00Z')));
expect('row lines: short', 2, m.estimateRowLines(r(0)));
expect('row lines: huge note is large', true, m.estimateRowLines(r(3)) > 10);
expect('columns', 15, m.EXPORT_COLUMNS.length);

const out = process.argv[2] ?? 'leads-export-sample.xlsx';
const blob = await buildLeadsWorkbook(rows);
writeFileSync(out, new Uint8Array(await blob.arrayBuffer()));
console.log(`wrote ${out} (${blob.size} bytes)`);

// Timing for a large list.
const many = Array.from({ length: 5000 }, (_, i) => ({ ...leads[i % 5], id: `m${i}` }));
const t0 = performance.now();
const big = await buildLeadsWorkbook(m.buildExportRows(many, ctxLegacy));
console.log(`5000 rows: ${Math.round(performance.now() - t0)} ms, ${big.size} bytes`);

console.log(`${total - failed}/${total} checks passed`);
if (failed > 0) process.exit(1);
