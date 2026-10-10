import { useState } from 'react';
import { Phone, MessageSquare, Check, X, FileEdit, RotateCcw, Play, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { StageChip } from '@/components/admin/consignment/StatusChip';
import type { AdminActions } from '@/components/admin/consignment/types';
import { consignmentService } from '@/services/consignmentService';
import { companyService } from '@/services/companyService';
import { dataStorage } from '@/services/dataStorage';
import { applicationStage, purposeLabel, STAGE_LABELS } from '@/utils/consignment';
import type { ApplicationStage } from '@/utils/consignment';
import type { ConsignmentListing, CustomerLead } from '@/types';

type StageFilter = 'all' | ApplicationStage;

const FILTERS: StageFilter[] = ['all', 'new', 'processing', 'draft', 'published', 'closed', 'rejected'];

interface ApplicationsPanelProps {
  leads: CustomerLead[];
  listings: ConsignmentListing[];
  actions: AdminActions;
  onOpenListing: (listing: ConsignmentListing) => void;
}

function priceRangeLabel(value?: string): string {
  if (!value) return 'Thương lượng';
  return companyService.getFilterConfig().priceRanges.find((p) => p.value === value)?.label ?? value;
}

function ApplicationCard({
  lead,
  listing,
  actions,
  onOpenListing,
  onReject,
}: {
  lead: CustomerLead;
  listing?: ConsignmentListing;
  actions: AdminActions;
  onOpenListing: (listing: ConsignmentListing) => void;
  onReject: (lead: CustomerLead) => void;
}) {
  const [note, setNote] = useState(lead.internalNote ?? '');
  const [approveError, setApproveError] = useState<string | null>(null);
  const stage = applicationStage(lead, listing);
  const created = new Date(lead.createdAt);

  const run = async (action: () => Promise<unknown>, message: string) => {
    if (!(await actions.attempt(action))) return false;
    actions.refresh();
    actions.notify(message);
    return true;
  };

  const handleApprove = async () => {
    setApproveError(null);
    try {
      const draft = await consignmentService.approveLead(lead);
      actions.refresh();
      actions.notify('Đã duyệt đơn và tạo tin nháp.');
      onOpenListing(draft);
    } catch (err) {
      actions.refresh();
      const reason = err instanceof Error ? err.message : 'Lỗi không xác định.';
      setApproveError(`Chưa duyệt xong đơn này (${reason}) Tin nháp có thể đã được tạo nhưng đơn chưa được cập nhật. Bấm "Thử lại": hệ thống dùng lại đúng tin nháp đó, không tạo bản trùng.`);
    }
  };

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-navy-900 text-base">{lead.fullName}</h3>
            <StageChip stage={stage} />
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-navy-50 text-navy-700">
              {purposeLabel(lead.purpose)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 font-mono font-medium text-slate-700 hover:text-gold-600">
              <Phone className="w-3.5 h-3.5" />
              {lead.phone}
            </a>
            <a
              href={`https://zalo.me/${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Zalo
            </a>
            <span>
              {created.toLocaleDateString('vi-VN')}{' '}
              {created.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 max-w-xs text-right">
          Tên và số điện thoại chủ nhà chỉ hiển thị trong trang quản trị, không bao giờ đưa lên website.
        </p>
      </header>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Khu vực</dt>
          <dd className="font-medium text-slate-700">{lead.region ? consignmentService.regionLabel(lead.region) : '-'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Loại BĐS</dt>
          <dd className="font-medium text-slate-700">{lead.propertyType ? consignmentService.propertyTypeLabel(lead.propertyType) : '-'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Khoảng giá</dt>
          <dd className="font-medium text-slate-700">{priceRangeLabel(lead.priceRange)}</dd>
        </div>
        <div className="col-span-2 md:col-span-1">
          <dt className="text-slate-400">Ghi chú của khách</dt>
          <dd className="text-slate-700 whitespace-pre-line break-words">{lead.note || '-'}</dd>
        </div>
      </dl>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor={`note-${lead.id}`}>
          Ghi chú nội bộ
        </label>
        <div className="flex gap-2 items-start">
          <textarea
            id={`note-${lead.id}`}
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Chỉ quản trị viên thấy: kết quả gọi, giá chủ nhà mong muốn, lý do từ chối..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={note === (lead.internalNote ?? '')}
            onClick={() => run(() => dataStorage.updateLead(lead.id, { internalNote: note.trim() }), 'Đã lưu ghi chú nội bộ.')}
            className="text-xs shrink-0"
          >
            Lưu ghi chú
          </Button>
        </div>
      </div>

      {approveError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-2.5 text-xs">
          <span className="flex-1 min-w-48">{approveError}</span>
          <Button type="button" variant="primary" size="sm" className="text-xs" onClick={handleApprove}>
            Thử lại
          </Button>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
        {stage === 'new' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={() => run(() => dataStorage.updateLead(lead.id, { status: 'processing' }), 'Đã chuyển sang Đang xử lý.')}
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Đang xử lý
          </Button>
        )}
        {(stage === 'new' || stage === 'processing') && (
          <>
            <Button type="button" variant="primary" size="sm" className="text-xs" onClick={handleApprove}>
              <Check className="w-3.5 h-3.5 mr-1" />
              Duyệt &amp; tạo tin nháp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs border-rose-300 text-rose-600 hover:bg-rose-500 hover:border-rose-500"
              onClick={() => onReject(lead)}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Từ chối
            </Button>
          </>
        )}
        {listing && (
          <Button type="button" variant="secondary" size="sm" className="text-xs" onClick={() => onOpenListing(listing)}>
            <FileEdit className="w-3.5 h-3.5 mr-1" />
            {stage === 'draft' ? 'Soạn tin' : 'Mở tin'}
          </Button>
        )}
        {listing && listing.status !== 'draft' && (
          <Link
            to={`/ky-gui/${listing.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Xem trên website
          </Link>
        )}
        {stage === 'rejected' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => run(() => dataStorage.updateLead(lead.id, { status: 'processing' }), 'Đã mở lại đơn.')}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Mở lại
          </Button>
        )}
      </footer>
    </article>
  );
}

export function ApplicationsPanel({ leads, listings, actions, onOpenListing }: ApplicationsPanelProps) {
  const [filter, setFilter] = useState<StageFilter>('all');
  const [rejecting, setRejecting] = useState<CustomerLead | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const applications = leads.filter((l) => l.source === 'consignment');
  const listingOf = (lead: CustomerLead) => listings.find((i) => i.id === lead.consignmentId);
  const stageOf = (lead: CustomerLead) => applicationStage(lead, listingOf(lead));
  const countOf = (f: StageFilter) => (f === 'all' ? applications.length : applications.filter((l) => stageOf(l) === f).length);
  const visible = applications.filter((l) => filter === 'all' || stageOf(l) === filter);

  const openReject = (lead: CustomerLead) => {
    setRejectNote(lead.internalNote ?? '');
    setRejecting(lead);
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    const internalNote = rejectNote.trim();
    if (!(await actions.attempt(() => dataStorage.updateLead(rejecting.id, { status: 'rejected', internalNote })))) return;
    setRejecting(null);
    actions.refresh();
    actions.notify('Đã từ chối đơn ký gửi.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc đơn theo trạng thái">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f
                ? 'bg-navy-900 text-gold-400 border-navy-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-navy-300'
            }`}
          >
            {f === 'all' ? 'Tất cả' : STAGE_LABELS[f]} ({countOf(f)})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-14 text-center text-sm text-slate-500">
          Không có đơn ký gửi nào ở trạng thái này.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((lead) => (
            <ApplicationCard
              // Re-keyed on the saved note so the textarea picks up notes written elsewhere (e.g. the reject dialog).
              key={`${lead.id}:${lead.internalNote ?? ''}`}
              lead={lead}
              listing={listingOf(lead)}
              actions={actions}
              onOpenListing={onOpenListing}
              onReject={openReject}
            />
          ))}
        </div>
      )}

      {rejecting && (
        <Modal isOpen onClose={() => setRejecting(null)} title="Từ chối đơn ký gửi" size="md">
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Đơn của <strong>{rejecting.fullName}</strong> sẽ chuyển sang trạng thái Từ chối. Khách không nhận thông báo nào.
            </p>
            <div>
              <label htmlFor="reject-note" className="block font-semibold text-slate-700 mb-1">Lý do (ghi chú nội bộ)</label>
              <textarea
                id="reject-note"
                rows={3}
                maxLength={1000}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejecting(null)}>
                Hủy
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={confirmReject}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
