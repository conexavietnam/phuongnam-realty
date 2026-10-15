import type { CustomerLead } from '../types/consignment';

// Pure row model for the "Xuất Excel" export. No DOM and no app imports (types only),
// so scripts/check-leads-export.mjs can run it under plain node.

export type CellKind = 'text' | 'phone' | 'date' | 'number';

export interface ExportColumn {
  key: string;
  header: string;
  kind: CellKind;
  width: number;
  wrap?: boolean;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'index', header: 'STT', kind: 'number', width: 6 },
  { key: 'createdAt', header: 'Thời gian', kind: 'date', width: 17 },
  { key: 'source', header: 'Nguồn', kind: 'text', width: 10 },
  { key: 'fullName', header: 'Họ và tên', kind: 'text', width: 24 },
  { key: 'phone', header: 'Số điện thoại', kind: 'phone', width: 16 },
  { key: 'email', header: 'Email', kind: 'text', width: 28 },
  { key: 'subject', header: 'Chủ đề', kind: 'text', width: 28, wrap: true },
  { key: 'purpose', header: 'Nhu cầu', kind: 'text', width: 11 },
  { key: 'region', header: 'Khu vực', kind: 'text', width: 22 },
  { key: 'propertyType', header: 'Loại BĐS', kind: 'text', width: 18 },
  { key: 'priceRange', header: 'Mức giá', kind: 'text', width: 18 },
  { key: 'note', header: 'Ghi chú của khách', kind: 'text', width: 60, wrap: true },
  { key: 'status', header: 'Trạng thái', kind: 'text', width: 16 },
  { key: 'internalNote', header: 'Ghi chú nội bộ', kind: 'text', width: 40, wrap: true },
  { key: 'listing', header: 'Tin ký gửi liên kết', kind: 'text', width: 34, wrap: true },
];

export interface ExportRow {
  index: number;
  // Wall-clock time in GMT+7 encoded as UTC fields (what the xlsx writer serialises), or null if unparseable.
  createdAt: Date | null;
  source: string;
  fullName: string;
  phone: string;
  email: string;
  subject: string;
  purpose: string;
  region: string;
  propertyType: string;
  priceRange: string;
  note: string;
  status: string;
  internalNote: string;
  listing: string;
}

// Label lookups come from the app (filters collection, status helpers); injected to keep this module pure.
export interface ExportContext {
  purposeLabel: (purpose: string) => string;
  regionLabel: (code: string) => string;
  typeLabel: (code: string) => string;
  priceLabel: (code: string) => string;
  statusLabel: (lead: CustomerLead) => string;
  // Title (or id when the listing is gone) of the linked consignment listing.
  listingLabel: (consignmentId: string) => string;
}

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

// Contact-form leads store "[Chủ đề: X] [Email: Y] - message" in `note` (server/src/handlers.php).
const CONTACT_NOTE = /^\[Chủ đề: ([\s\S]*?)\] \[Email: ([\s\S]*?)\] - ([\s\S]*)$/;

export function parseContactNote(note: string): { subject: string; email: string; message: string } | null {
  const match = CONTACT_NOTE.exec(note);
  if (!match) return null;
  const email = match[2].trim();
  return { subject: match[1].trim(), email: email.toUpperCase() === 'N/A' ? '' : email, message: match[3] };
}

// Characters XML 1.0 forbids (Excel refuses the file) plus lone surrogates; tab, LF and CR are legal.
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// Excel allows 32,767 characters per cell.
export const MAX_CELL_LENGTH = 32000;

export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.replace(XML_ILLEGAL, '').replace(/\r\n?/g, '\n');
  return text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH)}…` : text;
}

// Formula triggers for CSV/Excel. We store such values as typed string cells with the Text (@) number
// format, so they are never evaluated and also stay text if the user edits the cell.
export function looksLikeFormula(text: string): boolean {
  return /^[=+\-@\t\r]/.test(text);
}

export function toGmt7(iso: string): Date | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms + GMT7_OFFSET_MS);
}

export function sourceLabel(source: string): string {
  return source === 'consignment' ? 'Ký gửi' : 'Liên hệ';
}

export function buildExportRows(leads: CustomerLead[], ctx: ExportContext): ExportRow[] {
  return leads.map((lead, i) => {
    const contact = lead.source === 'contact' ? parseContactNote(lead.note ?? '') : null;
    return {
      index: i + 1,
      createdAt: toGmt7(lead.createdAt),
      source: sourceLabel(lead.source),
      fullName: cleanText(lead.fullName),
      phone: cleanText(lead.phone),
      email: cleanText(contact?.email ?? ''),
      subject: cleanText(contact?.subject ?? ''),
      purpose: ctx.purposeLabel(lead.purpose),
      region: cleanText(lead.region ? ctx.regionLabel(lead.region) : ''),
      propertyType: cleanText(lead.propertyType ? ctx.typeLabel(lead.propertyType) : ''),
      priceRange: cleanText(lead.priceRange ? ctx.priceLabel(lead.priceRange) : ''),
      note: cleanText(contact ? contact.message : lead.note),
      status: ctx.statusLabel(lead),
      internalNote: cleanText(lead.internalNote),
      listing: cleanText(lead.consignmentId ? ctx.listingLabel(lead.consignmentId) : ''),
    };
  });
}

// "khach-hang-20261015-1430.xlsx" with the time in GMT+7.
export function exportFileName(now: Date = new Date()): string {
  const d = new Date(now.getTime() + GMT7_OFFSET_MS).toISOString();
  return `khach-hang-${d.slice(0, 10).replaceAll('-', '')}-${d.slice(11, 13)}${d.slice(14, 16)}.xlsx`;
}

// Rough number of text lines a row needs, used to pick a row height (Excel does not always auto-fit on open).
export function estimateRowLines(row: ExportRow): number {
  let lines = 1;
  for (const col of EXPORT_COLUMNS) {
    if (!col.wrap) continue;
    const text = String(row[col.key as keyof ExportRow] ?? '');
    if (text === '') continue;
    const perLine = Math.max(1, Math.floor(col.width * 1.1));
    const count = text.split('\n').reduce((sum, part) => sum + Math.max(1, Math.ceil(part.length / perLine)), 0);
    lines = Math.max(lines, count);
  }
  return lines;
}
