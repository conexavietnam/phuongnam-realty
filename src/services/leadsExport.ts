import { companyService } from '@/services/companyService';
import { buildLeadsWorkbook } from '@/utils/leadsExportXlsx';
import { buildExportRows, exportFileName } from '@/utils/leadsExportModel';
import { leadStatusLabel, purposeLabel } from '@/utils/consignment';
import { typeLabel } from '@/utils/typeLabel';
import type { ConsignmentListing, CustomerLead } from '@/types';

const lookup = (options: Array<{ value: string; label: string }>, code: string) =>
  options.find((o) => o.value === code)?.label ?? code;

// Builds the .xlsx in the browser and downloads it. Loaded on demand (dynamic import) from the export button.
export async function exportLeadsToExcel(leads: CustomerLead[], listings: ConsignmentListing[]): Promise<string> {
  const filters = companyService.getFilterConfig();
  const listingOf = (id: string) => listings.find((l) => l.id === id);
  const rows = buildExportRows(leads, {
    purposeLabel,
    regionLabel: (c) => lookup(filters.regions, c),
    typeLabel: (c) => typeLabel(c),
    priceLabel: (c) => lookup(filters.priceRanges, c),
    statusLabel: (lead) => leadStatusLabel(lead, lead.consignmentId ? listingOf(lead.consignmentId) : undefined),
    listingLabel: (id) => listingOf(id)?.title || id,
  });
  const blob = await buildLeadsWorkbook(rows);
  const name = exportFileName();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return name;
}
