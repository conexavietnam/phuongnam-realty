import { StageChip } from '@/components/admin/consignment/StatusChip';
import { applicationStage, SECTION_LABELS } from '@/utils/consignment';
import type { ConsignmentListing, CustomerLead, LeadStatus } from '@/types';

// Contact-form leads keep the simple four-state select (old statuses map: contacted -> processing,
// completed -> closed, cancelled -> rejected). Consignment applications are handled in the Ký gửi tab.
const CONTACT_STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'Mới nhận' },
  { value: 'processing', label: 'Đang liên hệ' },
  { value: 'closed', label: 'Đã hoàn thành' },
  { value: 'rejected', label: 'Đã hủy' },
];

interface LeadStatusControlProps {
  lead: CustomerLead;
  listing?: ConsignmentListing;
  onChangeStatus: (id: string, status: LeadStatus) => void;
  onOpenListing: (listingId: string) => void;
  onOpenApplications: () => void;
}

export function LeadStatusControl({ lead, listing, onChangeStatus, onOpenListing, onOpenApplications }: LeadStatusControlProps) {
  if (lead.source === 'contact') {
    return (
      <select
        value={lead.status}
        onChange={(e) => onChangeStatus(lead.id, e.target.value as LeadStatus)}
        aria-label={`Trạng thái yêu cầu của ${lead.fullName}`}
        className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-gold-500"
      >
        {CONTACT_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <StageChip stage={applicationStage(lead, listing)} />
      {listing ? (
        <button
          type="button"
          onClick={() => onOpenListing(listing.id)}
          className="text-[11px] font-semibold text-gold-600 hover:text-gold-700 underline"
        >
          Đã tạo tin · {SECTION_LABELS[listing.section]}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenApplications}
          className="text-[11px] font-semibold text-slate-500 hover:text-navy-900 underline"
        >
          Xử lý trong tab Ký gửi
        </button>
      )}
    </div>
  );
}
