import { useId, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Sparkles } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ImageField } from '@/components/admin/ImageField';
import { SerpPreview } from '@/components/admin/seo/SerpPreview';
import { TagInput } from '@/components/admin/seo/TagInput';
import { companyService } from '@/services/companyService';
import { slugify } from '@/utils/slug';
import { SEO_DEFAULTS, collapseSpaces, siteSeo } from '@/utils/seo';
import {
  SEO_LIMITS,
  autoDescription,
  autoTitle,
  descriptionMeter,
  emptySeo,
  seoChecklist,
  siteHostLabel,
  titleMeter,
} from '@/utils/seoFields';
import type { MeterLevel } from '@/utils/seoFields';
import type { ItemSeo } from '@/types/seo';

interface SeoFieldsProps {
  value: ItemSeo | undefined;
  onChange: (next: ItemSeo) => void;
  // What the editor currently holds; used for the automatic defaults, the preview and the checklist.
  title: string;
  shortDescription: string;
  thumbnail: string;
  slug: string;
  // Public path segment of the item: "du-an", "chuyen-nhuong", "ky-gui" or "tin-tuc".
  section: string;
}

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs';
const METER_CLASS: Record<MeterLevel, string> = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-rose-600',
};

function Counter({ length, meter }: { length: number; meter: { level: MeterLevel; hint: string } }) {
  return (
    <span className={`text-[11px] font-semibold ${METER_CLASS[meter.level]}`} aria-live="polite">
      {length} ký tự · {meter.hint}
    </span>
  );
}

// Collapsible "SEO" block shared by the four article editors.
export function SeoFields({ value, onChange, title, shortDescription, thumbnail, slug, section }: SeoFieldsProps) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const company = companyService.getCompanyInfo();
  const site = siteSeo(company);
  const seo = value ?? emptySeo();
  const patch = (next: Partial<ItemSeo>) => onChange({ ...seo, ...next });

  const autoT = autoTitle(title, site.titleSuffix);
  const autoD = autoDescription(shortDescription, site.description);
  const effectiveTitle = collapseSpaces(seo.title) || autoT;
  const effectiveDescription = collapseSpaces(seo.description) || autoD;
  const titleLength = Array.from(effectiveTitle).length;
  const descriptionLength = Array.from(effectiveDescription).length;

  const checklist = seoChecklist({
    title,
    seoTitle: seo.title,
    seoDescription: seo.description,
    shortDescription,
    thumbnail,
    slug: slugify(slug.trim() || title),
    primaryKeyword,
  });
  const passed = checklist.filter((c) => c.ok).length;

  const fillFromContent = () => {
    const next: ItemSeo = { ...seo };
    if (!collapseSpaces(next.title)) next.title = Array.from(collapseSpaces(title)).slice(0, SEO_LIMITS.titleMax).join('');
    if (!collapseSpaces(next.description)) next.description = autoDescription(shortDescription, '');
    if (next.keywords.length === 0 && collapseSpaces(primaryKeyword)) next.keywords = [collapseSpaces(primaryKeyword)];
    onChange(next);
  };

  return (
    <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-bold text-navy-900 text-xs uppercase tracking-wider">
          {open ? <ChevronDown className="w-4 h-4 text-gold-500" /> : <ChevronRight className="w-4 h-4 text-gold-500" />}
          SEO · Google, Zalo, Facebook
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          {seo.noindex ? 'Đang ẩn khỏi Google' : `Đạt ${passed}/${checklist.length} tiêu chí`}
        </span>
      </button>

      {open && (
        <div id={`${uid}-panel`} className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-4">
          <p className="text-[11px] text-slate-500">
            Để trống thì hệ thống tự lấy từ tiêu đề và mô tả ngắn. Google có thể tự đổi tiêu đề hoặc mô tả hiển thị nếu thấy chưa phù hợp.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${uid}-primary`} className="block font-semibold text-slate-700 mb-1">
                Từ khóa chính <span className="font-normal text-slate-400">(chỉ dùng để chấm điểm, không lưu)</span>
              </label>
              <input
                id={`${uid}-primary`}
                type="text"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                placeholder="VD: căn hộ Thủ Đức"
                className={INPUT}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" size="sm" onClick={fillFromContent} className="text-xs py-2 px-3">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Tự điền từ nội dung
              </Button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <label htmlFor={`${uid}-title`} className="block font-semibold text-slate-700">Tiêu đề SEO (meta title)</label>
              <Counter length={titleLength} meter={titleMeter(titleLength)} />
            </div>
            <input
              id={`${uid}-title`}
              type="text"
              value={seo.title}
              maxLength={SEO_LIMITS.titleMax}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={autoT || `Tiêu đề bài viết${SEO_DEFAULTS.titleSuffix}`}
              className={INPUT}
            />
            {!seo.title.trim() && <p className="mt-1 text-[11px] text-slate-400">Đang dùng tiêu đề tự động: tiêu đề + hậu tố của website.</p>}
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <label htmlFor={`${uid}-description`} className="block font-semibold text-slate-700">Mô tả SEO (meta description)</label>
              <Counter length={descriptionLength} meter={descriptionMeter(descriptionLength)} />
            </div>
            <textarea
              id={`${uid}-description`}
              rows={3}
              value={seo.description}
              maxLength={SEO_LIMITS.descriptionMax}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder={autoD}
              className={INPUT}
            />
            {!seo.description.trim() && <p className="mt-1 text-[11px] text-slate-400">Đang dùng mô tả tự động lấy từ mô tả ngắn.</p>}
          </div>

          <div>
            <label htmlFor={`${uid}-keywords`} className="block font-semibold text-slate-700 mb-1">Từ khóa (keywords)</label>
            <TagInput id={`${uid}-keywords`} value={seo.keywords} onChange={(keywords) => patch({ keywords })} />
            <p className="mt-1 text-[11px] text-slate-400">Google không dùng thẻ keywords để xếp hạng; điền để ghi chú nội dung và cho các công cụ khác.</p>
          </div>

          <ImageField
            label="Ảnh chia sẻ mạng xã hội (OG image)"
            value={seo.ogImage ?? ''}
            onChange={(url) => patch({ ogImage: url })}
            category="general"
            helperText="Tùy chọn. Để trống sẽ dùng ảnh đại diện. Nên dùng ảnh JPG/PNG tỉ lệ 1200×630; Zalo và Facebook không hiển thị ảnh SVG."
          />

          <label className="flex items-start gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={seo.noindex === true}
              onChange={(e) => patch({ noindex: e.target.checked })}
              className="mt-0.5 w-4 h-4"
            />
            <span>
              Không cho Google lập chỉ mục (noindex)
              <span className="block font-normal text-[11px] text-slate-500">Trang vẫn mở được bằng link nhưng sẽ không xuất hiện trên Google và không nằm trong sitemap.</span>
            </span>
          </label>

          <SerpPreview
            title={effectiveTitle}
            host={siteHostLabel(company.website)}
            segments={[section, slugify(slug.trim() || title)]}
            description={effectiveDescription}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Kiểm tra nhanh</p>
            <ul className="space-y-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-px" aria-label="Đạt" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-px" aria-label="Chưa đạt" />
                  )}
                  <span className={item.ok ? 'text-slate-700' : 'text-slate-500'}>
                    {item.label}
                    {!item.ok && item.hint && <span className="text-slate-400"> · {item.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
