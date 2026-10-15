// Vietnamese number notation for the admin forms: "." groups thousands, "," is the decimal mark.
// Pure functions only (no imports) so scripts/check-numbers.mjs can run them under plain node.
//
// Vocabulary
//  - display: what the user sees, e.g. "3.500.000,5"
//  - edit:    the same without grouping, e.g. "3500000,5". Shape: "" | digits | digits "," [digits]; no leading zeros
//             (except a lone "0"). An edit string is what the typing logic works on; the emitted value is a number.

export const MAX_INT_DIGITS = 15;

export type MoneyKind = 'vnd' | 'billion' | 'area';

const SEPARATORS = /[.,]/;

export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function editToDisplay(edit: string): string {
  const comma = edit.indexOf(',');
  if (comma < 0) return groupDigits(edit);
  return `${groupDigits(edit.slice(0, comma))},${edit.slice(comma + 1)}`;
}

// Display (or any string of digits, "." and ",") to an edit string: "." is dropped, only the first "," survives.
export function displayToEdit(display: string): string {
  let out = '';
  let hasComma = false;
  for (const ch of display) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === ',' && !hasComma) {
      hasComma = true;
      out += ch;
    }
  }
  return out;
}

export function editToNumber(edit: string): number | null {
  if (edit === '' || edit === ',') return null;
  const value = Number(edit.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function numberToEdit(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return '';
  const fixed = value.toFixed(Math.max(0, decimals));
  const [int, frac = ''] = fixed.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return trimmed ? `${int},${trimmed}` : int;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  return editToDisplay(numberToEdit(value, decimals));
}

// Strict parse of a display string produced by formatNumber.
export function parseNumber(display: string): number | null {
  return editToNumber(displayToEdit(display));
}

interface Normalized {
  edit: string;
  caret: number;
}

// Clamps an edit candidate to the field's rules and moves the caret (an index into `edit`) along with the characters.
// Returns null when the integer part would be longer than MAX_INT_DIGITS.
export function normalizeEdit(candidate: string, caret: number, decimals: number): Normalized | null {
  let out = '';
  let outCaret = 0;
  let hasComma = false;
  let fracDigits = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    const ch = candidate[i];
    let keep = false;
    if (ch >= '0' && ch <= '9') {
      if (!hasComma) keep = true;
      else if (fracDigits < decimals) {
        keep = true;
        fracDigits += 1;
      }
    } else if (ch === ',' && decimals > 0 && !hasComma) {
      hasComma = true;
      keep = true;
    }
    if (keep) {
      out += ch;
      if (i < caret) outCaret += 1;
    }
  }
  const commaAt = out.indexOf(',');
  const intPart = commaAt < 0 ? out : out.slice(0, commaAt);
  let zeros = 0;
  while (zeros < intPart.length - 1 && intPart[zeros] === '0') zeros += 1;
  // A leading zero only counts as "before the caret" when the caret is past it.
  if (zeros > 0) {
    out = out.slice(zeros);
    outCaret = Math.max(0, outCaret - zeros);
  }
  if (out.startsWith(',')) {
    out = `0${out}`;
    outCaret += 1;
  }
  const digits = (out.indexOf(',') < 0 ? out : out.slice(0, out.indexOf(','))).length;
  if (digits > MAX_INT_DIGITS) return null;
  return { edit: out, caret: Math.min(outCaret, out.length) };
}

// Interprets pasted text. Heuristics (documented in docs/ADMIN_NEWS_MENU.md):
//  - everything but digits, "." and "," is ignored ("3,5 tỷ" -> "3,5", "3 500 000" -> "3500000")
//  - both "." and "," present: the last one is the decimal mark ("3.500,25", "3,500.25")
//  - one kind only, several times: grouping ("3.500.000", "1,234,567")
//  - one "," once: decimal mark ("3,5"); one "." once: grouping if exactly 3 digits follow ("3.500"), else decimal ("3.5")
// The result is rounded to `decimals` places; '' when nothing usable is left.
export function parsePasted(text: string, decimals: number): string {
  const t = text.replace(/[^\d.,]/g, '');
  if (!/\d/.test(t)) return '';
  const lastDot = t.lastIndexOf('.');
  const lastComma = t.lastIndexOf(',');
  const dots = (t.match(/\./g) ?? []).length;
  const commas = (t.match(/,/g) ?? []).length;
  let decimalAt = -1;
  if (dots > 0 && commas > 0) decimalAt = Math.max(lastDot, lastComma);
  else if (commas === 1) decimalAt = lastComma;
  else if (dots === 1 && t.length - lastDot - 1 !== 3) decimalAt = lastDot;
  const intDigits = (decimalAt < 0 ? t : t.slice(0, decimalAt)).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const fracDigits = decimalAt < 0 ? '' : t.slice(decimalAt + 1).replace(/\D/g, '');
  const places = Math.max(0, decimals);
  const scaledText = (intDigits || '0') + fracDigits;
  const fracLen = fracDigits.length;
  if (scaledText.length > MAX_INT_DIGITS + fracLen + 6) return '';
  let scaled = BigInt(scaledText);
  let scale = fracLen;
  if (fracLen > places) {
    const div = 10n ** BigInt(fracLen - places);
    scaled = (scaled + div / 2n) / div;
    scale = places;
  }
  const s = scaled.toString().padStart(scale + 1, '0');
  const int = scale === 0 ? s : s.slice(0, -scale);
  const frac = (scale === 0 ? '' : s.slice(-scale)).replace(/0+$/, '');
  if (int.length > MAX_INT_DIGITS) return '';
  return frac ? `${int},${frac}` : int;
}

export interface TypingResult {
  edit: string;
  // Caret as an index into `edit`.
  caret: number;
}

// Turns the browser's raw input value (after a keystroke, deletion, cut or paste) into the new edit string.
// `oldDisplay` is what was shown before the change, `caret` is the caret in `raw` after the change.
// The inserted text is found by comparing with the old display, so a "." the user types is told apart from the
// grouping dots the field printed itself. Returns null when the change must be rejected (too long / above max).
export function applyTyping(oldDisplay: string, raw: string, caret: number, decimals: number, max?: number): TypingResult | null {
  const suffix = raw.slice(caret);
  let prefixLen = 0;
  let inserted: string;
  let left = '';
  let right = '';
  if (suffix.length <= oldDisplay.length && oldDisplay.endsWith(suffix)) {
    const limit = oldDisplay.length - suffix.length;
    const head = raw.slice(0, caret);
    while (prefixLen < limit && prefixLen < head.length && head[prefixLen] === oldDisplay[prefixLen]) prefixLen += 1;
    inserted = head.slice(prefixLen);
    left = displayToEdit(oldDisplay.slice(0, prefixLen));
    right = displayToEdit(suffix);
  } else {
    inserted = raw;
  }
  let ins: string;
  if (inserted.length > 1) {
    ins = parsePasted(inserted, decimals);
  } else if (SEPARATORS.test(inserted)) {
    ins = decimals > 0 && !(left + right).includes(',') ? ',' : '';
  } else {
    ins = /\d/.test(inserted) ? inserted : '';
  }
  const result = normalizeEdit(left + ins + right, left.length + ins.length, decimals);
  if (!result) return null;
  if (max !== undefined) {
    const value = editToNumber(result.edit);
    if (value !== null && value > max) return null;
  }
  return result;
}

// Index in the display string that sits right after the `caret`-th significant character (digit or comma) of the edit.
export function caretInDisplay(display: string, caret: number): number {
  if (caret <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i += 1) {
    if (display[i] !== '.') seen += 1;
    if (seen === caret) return i + 1;
  }
  return display.length;
}

// ---------------------------------------------------------------------------------------------
// Prices and areas
// ---------------------------------------------------------------------------------------------

const trimmed = (value: number, decimals: number): string => formatNumber(Number(value.toFixed(decimals)), decimals);

// How a price in VND reads aloud: 3500000000 -> "3,5 tỷ đồng", 850000000 -> "850 triệu đồng".
// Round amounts use one decimal number; others are spelled out ("3 tỷ 256 triệu 700 nghìn đồng").
export function formatVndWords(vnd: number): string {
  if (!Number.isFinite(vnd) || vnd <= 0) return '';
  const v = Math.round(vnd);
  if (v >= 1e9 && v % 1e6 === 0) return `${trimmed(v / 1e9, 3)} tỷ đồng`;
  if (v >= 1e6 && v < 1e9 && v % 1e3 === 0) return `${trimmed(v / 1e6, 3)} triệu đồng`;
  if (v < 1e6) return v >= 1e3 && v % 1e3 === 0 ? `${v / 1e3} nghìn đồng` : `${formatNumber(v)} đồng`;
  const ty = Math.floor(v / 1e9);
  const trieu = Math.floor((v % 1e9) / 1e6);
  const nghin = Math.floor((v % 1e6) / 1e3);
  const dong = v % 1e3;
  const parts: string[] = [];
  if (ty > 0) parts.push(`${formatNumber(ty)} tỷ`);
  if (trieu > 0) parts.push(`${trieu} triệu`);
  if (nghin > 0) parts.push(`${nghin} nghìn`);
  parts.push(dong > 0 ? `${dong} đồng` : 'đồng');
  return parts.join(' ');
}

export function formatBillionWords(billions: number): string {
  return formatVndWords(Math.round(billions * 1e9));
}

// Short label for the "Mức giá hiển thị" text field: 3500000000 -> "3,5 tỷ", 850000000 -> "850 triệu".
export function formatPriceShort(vnd: number): string {
  if (!Number.isFinite(vnd) || vnd <= 0) return '';
  if (vnd >= 1e9) return `${trimmed(vnd / 1e9, 3)} tỷ`;
  if (vnd >= 1e6) return `${trimmed(vnd / 1e6, 3)} triệu`;
  return `${formatNumber(Math.round(vnd))} đồng`;
}

export function formatBillionShort(billions: number): string {
  return formatPriceShort(Math.round(billions * 1e9));
}

// Read-only display in admin tables and cards.
export function formatVnd(vnd: number | null | undefined): string {
  return vnd && vnd > 0 ? `${formatNumber(vnd)} ₫` : '—';
}

export function formatBillion(billions: number | null | undefined): string {
  return billions && billions > 0 ? `${formatNumber(billions, 3)} tỷ` : '—';
}

export function formatArea(area: number | null | undefined): string {
  return area && area > 0 ? `${formatNumber(area, 2)} m²` : '—';
}

// Soft warnings (never blocking) for values that look like a slipped zero.
export function magnitudeWarning(kind: MoneyKind, value: number | null): string | null {
  if (value === null || value <= 0) return null;
  if (kind === 'vnd') {
    if (value < 1e6) return 'Giá dưới 1 triệu đồng. Hãy kiểm tra lại số 0.';
    if (value > 1e12) return 'Giá trên 1.000 tỷ đồng. Hãy kiểm tra lại số 0.';
  }
  if (kind === 'billion') {
    if (value > 1000) return 'Giá trên 1.000 tỷ đồng. Hãy kiểm tra lại đơn vị.';
    if (value < 0.001) return 'Giá dưới 1 triệu đồng. Hãy kiểm tra lại đơn vị (ô này tính bằng tỷ).';
  }
  if (kind === 'area' && value > 100000) return 'Diện tích trên 100.000 m². Hãy kiểm tra lại.';
  return null;
}
