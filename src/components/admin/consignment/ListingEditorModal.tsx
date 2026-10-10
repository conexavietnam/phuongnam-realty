import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ImageField } from '@/components/admin/ImageField';
import { GalleryField } from '@/components/admin/GalleryField';
import { LazyRichTextEditor } from '@/components/admin/LazyRichTextEditor';
import type { AdminActions } from '@/components/admin/consignment/types';
import { consignmentService } from '@/services/consignmentService';
import { companyService } from '@/services/companyService';
import {
  CONSIGNMENT_STATUS_LABELS,
  DESCRIPTION_REWRITE_MESSAGE,
  listingUrl,
  needsDescriptionRewrite,
  SECTION_HELP,
  SECTION_LABELS,
} from '@/utils/consignment';
import { normalizeEditorHtml } from '@/utils/richText';
import { slugify } from '@/utils/slug';
import type { ConsignmentListing, ConsignmentPurpose, ConsignmentSection, ConsignmentStatus } from '@/types';

interface ListingEditorModalProps {
  initial: ConsignmentListing;
  isNew: boolean;
  actions: AdminActions;
  onClose: () => void;
}

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs';

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="block font-semibold text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

const MAX_HIGHLIGHTS = 20;

// One highlight per line; the raw text is kept locally so blank lines survive while typing.
function HighlightsField({ value, onChange }: { value: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <Field label={`Điểm nhấn (mỗi dòng một ý, tối đa ${MAX_HIGHLIGHTS})`} wide>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split('\n')
              .map((line) => line.trim().slice(0, 150))
              .filter(Boolean)
              .slice(0, MAX_HIGHLIGHTS),
          );
        }}
        className={INPUT}
      />
    </Field>
  );
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function ListingEditorModal({ initial, isNew, actions, onClose }: ListingEditorModalProps) {
  const [draft, setDraft] = useState<ConsignmentListing>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const filters = companyService.getFilterConfig();
  const sourceLead = consignmentService.getLeadOf(initial.id);
  const rewriteNeeded = needsDescriptionRewrite(draft, sourceLead);

  const set = <K extends keyof ConsignmentListing>(key: K, value: ConsignmentListing[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const fail = (message: string): null => {
    setError(message);
    return null;
  };

  // Returns the listing ready to save, or sets an error and returns null.
  const prepare = (status: ConsignmentStatus): ConsignmentListing | null => {
    const title = draft.title.trim();
    if (!title) return fail('Vui lòng nhập tiêu đề tin.');
    const slug = draft.slug.trim() ? slugify(draft.slug) : consignmentService.makeUniqueSlug(title, draft.id);
    if (!slug) return fail('Đường dẫn (slug) không hợp lệ.');
    const conflict = consignmentService.slugConflictMessage(slug, draft.id);
    if (conflict) return fail(conflict);
    if (status !== 'draft') {
      if (rewriteNeeded) return fail(DESCRIPTION_REWRITE_MESSAGE + '.');
      if (!draft.thumbnail) return fail('Cần có ảnh đại diện trước khi đăng tin.');
      if (!draft.region && !draft.location.trim()) return fail('Cần có khu vực hoặc vị trí trước khi đăng tin.');
    }
    setError(null);
    return {
      ...draft,
      title,
      slug,
      status,
      priceDisplay: draft.priceDisplay.trim(),
      shortDescription: draft.shortDescription.trim(),
      fullDescription: normalizeEditorHtml(draft.fullDescription),
    };
  };

  const save = async (status: ConsignmentStatus) => {
    const listing = prepare(status);
    if (!listing || saving) return;
    setSaving(true);
    const ok = await actions.attempt(() => consignmentService.save(listing));
    setSaving(false);
    if (!ok) return;
    actions.refresh();
    actions.notify(
      status === 'draft' ? `Đã lưu tin nháp "${listing.title}".` : `Đã lưu tin "${listing.title}".`,
    );
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    return save(draft.status);
  };

  return (
    <Modal isOpen onClose={onClose} title={isNew ? 'Tạo tin ký gửi mới' : `Chỉnh sửa tin: ${initial.title || 'Chưa đặt tên'}`} size="4xl">
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 rounded-xl border border-gold-500/40 bg-gold-500/5 p-4">
            <label className="block">
              <span className="block font-semibold text-slate-700 mb-1">Đăng vào mục</span>
              <select
                value={draft.section}
                onChange={(e) => set('section', e.target.value as ConsignmentSection)}
                className={`${INPUT} bg-white font-semibold`}
              >
                {(Object.keys(SECTION_LABELS) as ConsignmentSection[]).map((o) => (
                  <option key={o} value={o}>{SECTION_LABELS[o]}</option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-slate-600">{SECTION_HELP[draft.section]}</p>
            {!isNew && initial.status !== 'draft' && (
              <p className="mt-1">
                Địa chỉ công khai hiện tại:{' '}
                <Link to={listingUrl(initial)} target="_blank" className="font-mono font-semibold text-gold-600 underline">
                  {listingUrl(initial)}
                </Link>
                {initial.section !== draft.section && ' (sẽ đổi sau khi lưu; link cũ tự chuyển hướng)'}
              </p>
            )}
          </div>

          <Field label="Tiêu đề tin (*)" wide>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={300}
              placeholder="VD: Căn hộ 2PN Vinhomes Central Park view sông"
              className={INPUT}
            />
          </Field>

          <Field label="Đường dẫn (slug)">
            <input
              type="text"
              value={draft.slug}
              onChange={(e) => set('slug', e.target.value)}
              maxLength={200}
              placeholder="Để trống để tự tạo từ tiêu đề"
              className={`${INPUT} font-mono`}
            />
          </Field>

          <Field label="Trạng thái">
            <select value={draft.status} onChange={(e) => set('status', e.target.value as ConsignmentStatus)} className={`${INPUT} bg-white`}>
              {(Object.keys(CONSIGNMENT_STATUS_LABELS) as ConsignmentStatus[]).map((s) => (
                <option key={s} value={s}>{CONSIGNMENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>

          <Field label="Nhu cầu">
            <select value={draft.purpose} onChange={(e) => set('purpose', e.target.value as ConsignmentPurpose)} className={`${INPUT} bg-white`}>
              <option value="ban">Cần bán</option>
              <option value="cho-thue">Cho thuê</option>
            </select>
          </Field>

          <Field label="Loại hình BĐS">
            <select value={draft.propertyType} onChange={(e) => set('propertyType', e.target.value)} className={`${INPUT} bg-white`}>
              <option value="">Chưa chọn</option>
              {filters.propertyTypes.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Khu vực (dùng cho bộ lọc)">
            <select value={draft.region} onChange={(e) => set('region', e.target.value)} className={`${INPUT} bg-white`}>
              <option value="">Chưa chọn</option>
              {filters.regions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Vị trí / địa chỉ hiển thị">
            <input type="text" value={draft.location} onChange={(e) => set('location', e.target.value)} maxLength={300} className={INPUT} />
          </Field>

          <Field label="Quận / huyện">
            <input type="text" value={draft.district} onChange={(e) => set('district', e.target.value)} maxLength={150} className={INPUT} />
          </Field>

          <Field label="Giá (tỷ VNĐ, dùng cho bộ lọc)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.price || ''}
              onChange={(e) => set('price', toNumber(e.target.value))}
              placeholder="VD: 4.5 (để trống = Liên hệ)"
              className={INPUT}
            />
          </Field>

          <Field label="Giá hiển thị">
            <input
              type="text"
              value={draft.priceDisplay}
              onChange={(e) => set('priceDisplay', e.target.value)}
              maxLength={100}
              placeholder="VD: 4.5 Tỷ hoặc 18 Triệu/tháng"
              className={INPUT}
            />
          </Field>

          <Field label="Diện tích (m²)">
            <input type="number" min={0} value={draft.area || ''} onChange={(e) => set('area', toNumber(e.target.value))} className={INPUT} />
          </Field>

          {draft.section !== 'du-an' && (
            <Field label="Hướng">
              <input type="text" value={draft.direction} onChange={(e) => set('direction', e.target.value)} maxLength={100} className={INPUT} />
            </Field>
          )}

          <Field label="Phòng ngủ">
            <input type="number" min={0} value={draft.bedrooms || ''} onChange={(e) => set('bedrooms', toNumber(e.target.value))} className={INPUT} />
          </Field>

          {draft.section !== 'du-an' && (
            <>
              <Field label="Phòng tắm">
                <input type="number" min={0} value={draft.bathrooms || ''} onChange={(e) => set('bathrooms', toNumber(e.target.value))} className={INPUT} />
              </Field>

              <Field label="Pháp lý">
                <input type="text" value={draft.legal} onChange={(e) => set('legal', e.target.value)} maxLength={200} placeholder="Sổ hồng riêng" className={INPUT} />
              </Field>
            </>
          )}

          {draft.section === 'chuyen-nhuong' && (
            <>
              <Field label="Tầng / vị trí trong tòa">
                <input type="text" value={draft.floor} onChange={(e) => set('floor', e.target.value)} maxLength={100} placeholder="VD: Tầng 18" className={INPUT} />
              </Field>

              <Field label="Tầm nhìn">
                <input type="text" value={draft.view} onChange={(e) => set('view', e.target.value)} maxLength={150} placeholder="VD: View sông Sài Gòn" className={INPUT} />
              </Field>
            </>
          )}

          {draft.section === 'du-an' && (
            <>
              <Field label="Chủ đầu tư">
                <input type="text" value={draft.investor} onChange={(e) => set('investor', e.target.value)} maxLength={200} className={INPUT} />
              </Field>

              <Field label="Tình trạng dự án">
                <input type="text" value={draft.projectStatus} onChange={(e) => set('projectStatus', e.target.value)} maxLength={100} placeholder="VD: Đang mở bán" className={INPUT} />
              </Field>

              <Field label="Giá từ (hiển thị)">
                <input type="text" value={draft.priceFrom} onChange={(e) => set('priceFrom', e.target.value)} maxLength={100} placeholder="VD: 3.5 Tỷ" className={INPUT} />
              </Field>

              <Field label="Nhóm loại hình (hiển thị)">
                <input type="text" value={draft.categoryLabel} onChange={(e) => set('categoryLabel', e.target.value)} maxLength={100} placeholder="VD: Căn hộ cao cấp" className={INPUT} />
              </Field>

              <HighlightsField value={draft.highlights} onChange={(items) => set('highlights', items)} />
            </>
          )}

          <div className="md:col-span-2">
            <ImageField
              label="Ảnh đại diện (Thumbnail)"
              value={draft.thumbnail}
              onChange={(url) => set('thumbnail', url)}
              category="property"
              helperText="Hiển thị trên thẻ tin ở trang Ký gửi và trang chủ. Cần có trước khi đăng."
            />
          </div>

          <div className="md:col-span-2">
            <GalleryField
              label="Bộ sưu tập ảnh (Gallery)"
              images={draft.images}
              onChange={(images) => set('images', images)}
              category="property"
              helperText="Có thể chọn hoặc tải lên nhiều ảnh cùng lúc."
            />
          </div>

          {sourceLead && (
            <div className="md:col-span-2 space-y-2">
              <p className="bg-sky-50 border border-sky-200 text-sky-800 rounded-xl px-4 py-2.5">
                Tin này tạo từ đơn ký gửi. Tên và số điện thoại chủ nhà không bao giờ được đăng công khai; chỉ hotline công ty được hiển thị.
              </p>
              {rewriteNeeded && (
                <p role="status" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-2.5 font-semibold">
                  {DESCRIPTION_REWRITE_MESSAGE}
                </p>
              )}
            </div>
          )}

          <Field label="Mô tả ngắn" wide>
            <textarea
              rows={3}
              value={draft.shortDescription}
              onChange={(e) => set('shortDescription', e.target.value)}
              maxLength={3000}
              className={INPUT}
            />
          </Field>

          <div className="md:col-span-2">
            <span className="block font-semibold text-slate-700 mb-1">Bài viết chi tiết</span>
            <LazyRichTextEditor value={draft.fullDescription} onChange={(html) => set('fullDescription', html)} category="property" />
          </div>

          <label className="flex items-center gap-2 md:col-span-2 font-semibold text-slate-700">
            <input type="checkbox" checked={draft.featured} onChange={(e) => set('featured', e.target.checked)} />
            Tin nổi bật
          </label>
        </div>

        {error && (
          <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div>
            {!isNew && initial.status !== 'draft' && (
              <Link to={listingUrl(initial)} target="_blank" className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-navy-900">
                <ExternalLink className="w-3.5 h-3.5" />
                Xem trên website
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={saving || (draft.status !== 'draft' && rewriteNeeded)}>
              Lưu
            </Button>
            {draft.status === 'draft' && (
              <Button type="button" variant="primary" size="sm" disabled={saving || rewriteNeeded} onClick={() => save('published')}>
                Lưu &amp; Đăng
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
