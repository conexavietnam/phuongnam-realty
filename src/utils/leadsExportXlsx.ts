import writeXlsxFile from 'write-excel-file/browser';
import { EXPORT_COLUMNS, estimateRowLines, looksLikeFormula } from './leadsExportModel.ts';
import type { ExportRow } from './leadsExportModel.ts';

export const SHEET_NAME = 'Khách hàng';
export const DATE_FORMAT = 'dd/mm/yyyy hh:mm';

const FONT = { fontFamily: 'Calibri', fontSize: 11 };
const HEADER_FILL = '#0F2942';
const LINE_HEIGHT_PT = 15;
const MAX_LINES = 10;

type Cell = Record<string, unknown> | null;

const base = { ...FONT, alignVertical: 'top' } as const;

const headerCell = (value: string): Cell => ({
  value,
  ...base,
  fontWeight: 'bold',
  textColor: '#FFFFFF',
  backgroundColor: HEADER_FILL,
  alignVertical: 'center',
  wrap: true,
  height: 24,
});

// Every text value is written as a typed string cell (shared-string, never a formula). Values that start with
// = + - @ and phone numbers also get the Text (@) format, so Excel keeps them as text even when edited.
function textCell(value: string, wrap: boolean, forceText: boolean): Cell {
  if (value === '') return null;
  const asText = forceText || looksLikeFormula(value);
  return { value, type: String, ...base, wrap, ...(asText ? { format: '@' } : {}) };
}

function dataCell(row: ExportRow, key: string, kind: string, wrap: boolean): Cell {
  const value = row[key as keyof ExportRow];
  if (kind === 'number') return { value: value as number, type: Number, ...base, align: 'center' };
  if (kind === 'date') {
    return value instanceof Date ? { value, type: Date, format: DATE_FORMAT, ...base, align: 'left' } : null;
  }
  return textCell(String(value ?? ''), wrap, kind === 'phone');
}

const XML_PROLOG = /^<\?xml[^>]*\?>/;
const UTF8_PROLOG = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// The library writes some parts with a bare <?xml version="1.0"?>; spell out UTF-8 so no reader has to guess.
const withUtf8Prolog = (xml: string) => (XML_PROLOG.test(xml) ? xml.replace(XML_PROLOG, UTF8_PROLOG) : UTF8_PROLOG + xml);

// write-excel-file has no AutoFilter, so it is added through the library's "feature" hook: <autoFilter> must come
// right after <sheetData>, and the hidden _FilterDatabase name makes Excel treat it as a native filter.
// sharedStrings.xml is generated after the hooks run, so it keeps the library's bare prolog (UTF-8 by XML default).
// The default pane is also tidied for a header-only freeze (no xSplit, bottom-left pane active).
function leadsSheetFeature(lastRow: number) {
  const lastCol = String.fromCharCode(64 + EXPORT_COLUMNS.length);
  const definedNames = `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${SHEET_NAME}'!$A$1:$${lastCol}$${lastRow}</definedName></definedNames>`;
  return {
    files: {
      transform: {
        'xl/worksheets/sheet{id}.xml': {
          transform: (xml: string) =>
            withUtf8Prolog(xml)
              .replace(' xSplit="0"', '')
              .replace('activePane="bottomRight"', 'activePane="bottomLeft"')
              .replace('</sheetData>', `</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/>`),
        },
        'xl/workbook.xml': {
          transform: (xml: string) => withUtf8Prolog(xml.replace('<definedNames/>', '').replace('</sheets>', `</sheets>${definedNames}`)),
        },
        'xl/styles.xml': { transform: withUtf8Prolog },
        'xl/_rels/workbook.xml.rels': { transform: withUtf8Prolog },
      },
    },
  };
}

export async function buildLeadsWorkbook(rows: ExportRow[]): Promise<Blob> {
  const data: Cell[][] = [EXPORT_COLUMNS.map((c) => headerCell(c.header))];
  for (const row of rows) {
    const cells = EXPORT_COLUMNS.map((c) => dataCell(row, c.key, c.kind, c.wrap === true));
    const lines = estimateRowLines(row);
    if (lines > 1) {
      // The STT cell is never empty; the row takes the tallest cell height.
      cells[0] = { ...cells[0], height: Math.min(lines, MAX_LINES) * LINE_HEIGHT_PT };
    }
    data.push(cells);
  }

  return writeXlsxFile(
    data as never,
    {
      sheet: SHEET_NAME,
      columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
      stickyRowsCount: 1,
    },
    { ...FONT, features: [leadsSheetFeature(rows.length + 1)] as never },
  ).toBlob();
}
