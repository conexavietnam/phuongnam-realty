import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ExternalLink, Send, Undo2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ListingStatusChip } from '@/components/admin/consignment/StatusChip';
import type { AdminActions } from '@/components/admin/consignment/types';
import { consignmentService } from '@/services/consignmentService';
import { CONSIGNMENT_STATUS_LABELS, priceLabel } from '@/utils/consignment';
import type { ConsignmentListing, ConsignmentStatus } from '@/types';

type StatusFilter = 'all' | ConsignmentStatus;

const FILTERS: StatusFilter[] = ['all', 'draft', 'published', 'sold'];

interface ListingsPanelProps {
  listings: ConsignmentListing[];
  actions: AdminActions;
  onEdit: (listing: ConsignmentListing) => void;
  onCreate: () => void;
}

const ICON_BUTTON = 'p-1.5 rounded-lg';

export function ListingsPanel({ listings, actions, onEdit, onCreate }: ListingsPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const keyword = search.trim().toLowerCase();
  const visible = listings.filter(
    (i) =>
      (filter === 'all' || i.status === filter) &&
      (keyword === '' || i.title.toLowerCase().includes(keyword) || i.location.toLowerCase().includes(keyword)),
  );
  const countOf = (f: StatusFilter) => (f === 'all' ? listings.length : listings.filter((i) => i.status === f).length);

  const changeStatus = async (item: ConsignmentListing, status: ConsignmentStatus, message: string) => {
    if (!(await actions.attempt(() => consignmentService.setStatus(item, status)))) return;
    actions.refresh();
    actions.notify(message);
  };

  const handleDelete = async (item: ConsignmentListing) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tin "${item.title}" không? Thao tác này không thể hoàn tác.`)) return;
    if (!(await actions.attempt(() => consignmentService.remove(item.id)))) return;
    actions.refresh();
    actions.notify(`Đã xóa tin "${item.title}".`);
  };

  const canPublish = (item: ConsignmentListing) => item.title.trim() !== '' && item.thumbnail !== '';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc tin theo trạng thái">
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
              {f === 'all' ? 'Tất cả' : CONSIGNMENT_STATUS_LABELS[f]} ({countOf(f)})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc vị trí..."
              aria-label="Tìm tin ký gửi"
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 w-44 sm:w-60 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
          <Button type="button" variant="primary" size="sm" onClick={onCreate} className="text-xs shadow-sm">
            <Plus className="w-4 h-4 mr-1" />
            Tạo tin mới
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tin ký gửi</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Loại hình</th>
                <th className="py-3 px-4">Giá</th>
                <th className="py-3 px-4">Vị trí</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Chưa có tin ký gửi nào phù hợp.
                  </td>
                </tr>
              )}
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-12 h-10 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-10 rounded-lg bg-slate-100 shrink-0 border border-dashed border-slate-300" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-navy-900 text-sm max-w-xs truncate">{item.title || '(chưa có tiêu đề)'}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">/ky-gui/{item.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><ListingStatusChip status={item.status} /></td>
                  <td className="py-3 px-4 text-slate-600">
                    {item.propertyType ? consignmentService.propertyTypeLabel(item.propertyType) : '-'}
                    <span className="text-slate-400"> · {item.purpose === 'cho-thue' ? 'Cho thuê' : 'Bán'}</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-gold-600 whitespace-nowrap">{priceLabel(item)}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{item.location || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {item.status !== 'draft' && (
                        <Link
                          to={`/ky-gui/${item.slug}`}
                          target="_blank"
                          className={`${ICON_BUTTON} text-slate-400 hover:text-navy-900 hover:bg-slate-100`}
                          title="Xem ngoài web"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      {item.status === 'draft' && (
                        <button
                          type="button"
                          disabled={!canPublish(item)}
                          onClick={() => changeStatus(item, 'published', `Đã đăng tin "${item.title}".`)}
                          className={`${ICON_BUTTON} text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={canPublish(item) ? 'Đăng tin' : 'Cần có tiêu đề và ảnh đại diện trước khi đăng'}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {item.status !== 'draft' && (
                        <button
                          type="button"
                          onClick={() => changeStatus(item, 'draft', `Đã gỡ tin "${item.title}" về nháp.`)}
                          className={`${ICON_BUTTON} text-amber-600 hover:bg-amber-50`}
                          title="Gỡ về nháp"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === 'published' && (
                        <button
                          type="button"
                          onClick={() => changeStatus(item, 'sold', `Đã đánh dấu "${item.title}" đã giao dịch.`)}
                          className={`${ICON_BUTTON} text-slate-600 hover:bg-slate-100`}
                          title="Đánh dấu đã giao dịch"
                        >
                          <BadgeCheck className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === 'sold' && (
                        <button
                          type="button"
                          onClick={() => changeStatus(item, 'published', `Đã đăng lại tin "${item.title}".`)}
                          className={`${ICON_BUTTON} text-emerald-600 hover:bg-emerald-50`}
                          title="Mở bán lại (Đang đăng)"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className={`${ICON_BUTTON} text-blue-600 hover:bg-blue-50`}
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className={`${ICON_BUTTON} text-rose-500 hover:bg-rose-50`}
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
