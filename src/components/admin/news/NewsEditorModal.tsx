import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { ImageField } from '@/components/admin/ImageField';
import { LazyRichTextEditor } from '@/components/admin/LazyRichTextEditor';
import { SeoFields } from '@/components/admin/seo/SeoFields';
import { SlugField } from '@/components/admin/seo/SlugField';
import type { AdminActions } from '@/components/admin/consignment/types';
import { dataStorage } from '@/services/dataStorage';
import { cleanSeoForSave } from '@/utils/seoFields';
import { newId } from '@/utils/ids';
import { slugify } from '@/utils/slug';
import { nextOldSlugs } from '@/utils/slugHistory';
import { normalizeEditorHtml, stripHtml } from '@/utils/richText';
import {
  formatNewsDateTime,
  fromDateTimeLocal,
  newsSlugConflict,
  plainWords,
  readTimeLabel,
  readTimeMinutes,
  readTimeToMinutes,
  sortCategories,
  toDateTimeLocal,
  usedAuthors,
} from '@/utils/newsMeta';
import { CATEGORY_LIMITS, categorySlugFromLabel, renumber, toCategory, uniqueCategorySlug } from '@/utils/newsCategories';
import type { NewsArticle } from '@/types/news';

export type EditableNews = NewsArticle & { featured?: boolean };

interface NewsEditorModalProps {
  initial: EditableNews;
  isNew: boolean;
  actions: AdminActions;
  onClose: () => void;
}

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs';
const LABEL = 'block font-semibold text-slate-700 mb-1';
const AUTHOR_LIST_ID = 'news-author-options';

export function NewsEditorModal({ initial, isNew, actions, onClose }: NewsEditorModalProps) {
  const [draft, setDraft] = useState<EditableNews>(initial);
  const news = dataStorage.getNews();
  const categories = sortCategories(dataStorage.getNewsCategories());
  const authors = usedAuthors(news);

  // Reading time: automatic (from the text) unless the editor typed their own number.
  const storedMinutes = readTimeToMinutes(initial.readTime);
  const [readAuto, setReadAuto] = useState(
    isNew || storedMinutes === null || initial.readTime === readTimeLabel(readTimeMinutes(initial.content)),
  );
  const [manualMinutes, setManualMinutes] = useState<number | null>(storedMinutes ?? readTimeMinutes(initial.content));
  const autoMinutes = readTimeMinutes(draft.content);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickLabel, setQuickLabel] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const savedSlug = news.find((n) => n.id === draft.id)?.slug ?? '';
  const categoryKnown = categories.some((c) => c.slug === draft.category);

  const patch = (changes: Partial<EditableNews>) => setDraft((current) => ({ ...current, ...changes }));

  const selectCategory = (slug: string) => {
    const category = categories.find((c) => c.slug === slug);
    if (category) patch({ category: category.slug, categoryLabel: category.label });
  };

  const createQuickCategory = async () => {
    const label = quickLabel.trim();
    if (!label) {
      setQuickError('Vui lòng nhập tên danh mục.');
      return;
    }
    if (label.length > CATEGORY_LIMITS.label) {
      setQuickError(`Tên danh mục tối đa ${CATEGORY_LIMITS.label} ký tự.`);
      return;
    }
    if (categories.length >= CATEGORY_LIMITS.max) {
      setQuickError(`Tối đa ${CATEGORY_LIMITS.max} danh mục.`);
      return;
    }
    const existing = categories.find((c) => c.label.trim().toLowerCase() === label.toLowerCase());
    if (existing) {
      selectCategory(existing.slug);
      setQuickOpen(false);
      setQuickLabel('');
      return;
    }
    const slug = uniqueCategorySlug(categorySlugFromLabel(label), new Set(categories.map((c) => c.slug)));
    const created = toCategory(newId('cat'), categories.length + 1, { label, slug, description: '', seoTitle: '', seoDescription: '' });
    setQuickBusy(true);
    const ok = await actions.attempt(() => dataStorage.saveNewsCategories(renumber([...categories, created])));
    setQuickBusy(false);
    if (!ok) return;
    actions.refresh();
    patch({ category: created.slug, categoryLabel: created.label });
    setQuickOpen(false);
    setQuickLabel('');
    setQuickError(null);
    actions.notify(`Đã tạo danh mục "${created.label}".`);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !draft.title.trim()) return;
    const normalizedContent = normalizeEditorHtml(draft.content);
    if (!stripHtml(normalizedContent) && !/<img\b/i.test(normalizedContent)) {
      alert('Vui lòng nhập nội dung bài viết.');
      return;
    }
    if (!draft.category) {
      alert('Vui lòng chọn danh mục cho bài viết.');
      return;
    }
    if (!fromDateTimeLocal(toDateTimeLocal(draft.publishedAt))) {
      alert('Vui lòng chọn ngày giờ đăng hợp lệ.');
      return;
    }
    const minutes = readAuto ? readTimeMinutes(normalizedContent) : (manualMinutes ?? 0);
    if (minutes < 1) {
      alert('Thời gian đọc phải từ 1 phút trở lên.');
      return;
    }

    const slug = slugify(draft.slug.trim() || draft.title) || draft.id;
    const conflict = newsSlugConflict(news, slug, draft.id);
    if (conflict) {
      alert(conflict);
      return;
    }
    const category = categories.find((c) => c.slug === draft.category);
    const toSave: EditableNews = {
      ...draft,
      content: normalizedContent,
      slug,
      author: draft.author.trim(),
      categoryLabel: category?.label ?? draft.categoryLabel,
      readTime: readTimeLabel(minutes),
      seo: cleanSeoForSave(draft.seo),
      oldSlugs: nextOldSlugs(news.find((n) => n.id === draft.id), slug),
    };

    setSaving(true);
    const ok = await actions.attempt(() => dataStorage.saveNews(toSave));
    setSaving(false);
    if (!ok) return;
    actions.refresh();
    onClose();
    actions.notify(`Đã lưu bài viết "${toSave.title}" thành công!`);
  };

  return (
    <Modal isOpen onClose={onClose} title={isNew ? 'Thêm Bài Viết Mới' : 'Chỉnh Sửa Tin Tức'} size="2xl">
      <form onSubmit={handleSave} className="space-y-5 text-xs">
        <div>
          <label htmlFor="newsTitle" className={LABEL}>Tiêu đề bài viết (*)</label>
          <input
            id="newsTitle"
            type="text"
            required
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            className={INPUT}
          />
        </div>

        <SlugField
          id="newsSlug"
          value={draft.slug}
          onChange={(slug) => patch({ slug })}
          title={draft.title}
          prefix="/tin-tuc/"
          savedSlug={savedSlug}
          published={savedSlug !== ''}
          conflict={(slug) => newsSlugConflict(news, slug, draft.id)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="newsCategory" className={LABEL}>Danh mục (*)</label>
            <select
              id="newsCategory"
              value={draft.category}
              onChange={(e) => selectCategory(e.target.value)}
              className={`${INPUT} bg-white`}
            >
              {!categoryKnown && (
                <option value={draft.category}>{draft.categoryLabel || draft.category || '-- Chọn danh mục --'} (không còn trong danh sách)</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            {!quickOpen ? (
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                className="mt-1 text-[11px] font-semibold text-gold-600 hover:text-gold-700"
              >
                + Tạo danh mục nhanh
              </button>
            ) : (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <label htmlFor="newsQuickCategory" className="block text-[11px] font-semibold text-slate-700">Tên danh mục mới</label>
                <input
                  id="newsQuickCategory"
                  type="text"
                  value={quickLabel}
                  maxLength={CATEGORY_LIMITS.label}
                  onChange={(e) => {
                    setQuickLabel(e.target.value);
                    setQuickError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void createQuickCategory();
                    }
                  }}
                  placeholder="VD: Pháp lý"
                  className={INPUT}
                />
                {quickError && <p role="alert" className="text-[11px] font-semibold text-rose-700">{quickError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={quickBusy}
                    onClick={() => void createQuickCategory()}
                    className="px-3 py-1.5 rounded bg-gold-500 text-white text-xs font-medium hover:bg-gold-600 disabled:opacity-50"
                  >
                    {quickBusy ? 'Đang tạo...' : 'Tạo và chọn'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickOpen(false);
                      setQuickError(null);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-navy-900"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="newsAuthor" className={LABEL}>Tác giả</label>
            <input
              id="newsAuthor"
              type="text"
              list={AUTHOR_LIST_ID}
              value={draft.author}
              maxLength={100}
              onChange={(e) => patch({ author: e.target.value })}
              placeholder="Chọn tên đã dùng hoặc gõ tên mới"
              className={INPUT}
            />
            <datalist id={AUTHOR_LIST_ID}>
              {authors.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="newsPublishedAt" className={LABEL}>Ngày giờ đăng (giờ Việt Nam, GMT+7)</label>
            <input
              id="newsPublishedAt"
              type="datetime-local"
              value={toDateTimeLocal(draft.publishedAt)}
              onChange={(e) => {
                const iso = fromDateTimeLocal(e.target.value);
                if (iso) patch({ publishedAt: iso });
              }}
              className={INPUT}
            />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>Hiển thị: {formatNewsDateTime(draft.publishedAt)}</span>
              <button
                type="button"
                onClick={() => patch({ publishedAt: new Date().toISOString() })}
                className="font-semibold text-gold-600 hover:text-gold-700"
              >
                Đặt là bây giờ
              </button>
            </div>
          </div>

          <div>
            <span className={LABEL}>Thời gian đọc</span>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={readAuto} onChange={(e) => setReadAuto(e.target.checked)} className="rounded border-slate-300" />
              Tự tính từ nội dung
            </label>
            {readAuto ? (
              <p className="mt-1 text-[11px] text-slate-500" data-testid="read-time-auto">
                {readTimeLabel(autoMinutes)} (khoảng {plainWords(draft.content).length} từ, 200 từ/phút)
              </p>
            ) : (
              <div className="mt-1">
                <NumberInput
                  value={manualMinutes}
                  onChange={setManualMinutes}
                  max={999}
                  min={1}
                  unit="phút"
                  ariaLabel="Thời gian đọc (phút)"
                  className={INPUT}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <ImageField
            label="Ảnh đại diện bài viết (Thumbnail)"
            value={draft.thumbnail}
            onChange={(url) => patch({ thumbnail: url })}
            category="news"
            required
            helperText="Ảnh bìa hiển thị trên trang tin tức và mạng xã hội."
          />
        </div>

        <div>
          <label htmlFor="newsExcerpt" className={LABEL}>Tóm tắt ngắn (Excerpt)</label>
          <textarea
            id="newsExcerpt"
            rows={2}
            value={draft.excerpt}
            onChange={(e) => patch({ excerpt: e.target.value })}
            className={INPUT}
          />
        </div>

        <div>
          <span className="block font-semibold text-slate-700 mb-1.5">Nội dung chi tiết bài viết (*)</span>
          <LazyRichTextEditor value={draft.content} onChange={(html) => patch({ content: html })} category="news" />
        </div>

        <div>
          <SeoFields
            value={draft.seo}
            onChange={(seo) => patch({ seo })}
            title={draft.title}
            shortDescription={draft.excerpt}
            thumbnail={draft.thumbnail}
            slug={draft.slug}
            section="tin-tuc"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu Bài Viết'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
