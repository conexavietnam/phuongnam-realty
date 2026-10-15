import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import type { AdminActions } from '@/components/admin/consignment/types';
import { dataStorage } from '@/services/dataStorage';
import { useDataListener } from '@/hooks';
import { categoryPath, countByCategory, sortCategories } from '@/utils/newsMeta';
import {
  CATEGORY_LIMITS,
  categoryProblem,
  categorySlugFromLabel,
  renumber,
  toCategory,
  uniqueCategorySlug,
} from '@/utils/newsCategories';
import { newId } from '@/utils/ids';
import { slugify } from '@/utils/slug';
import { nextOldSlugs } from '@/utils/slugHistory';
import type { NewsArticle, NewsCategoryItem } from '@/types/news';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/40';
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-navy-900 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed';

// Articles that follow a category when it is renamed or when its articles are moved elsewhere.
function withCategory(news: NewsArticle[], from: string, to: { slug: string; label: string }): NewsArticle[] {
  return news.map((n) => (n.category === from ? { ...n, category: to.slug, categoryLabel: to.label } : n));
}

interface EditorProps {
  original?: NewsCategoryItem;
  categories: NewsCategoryItem[];
  actions: AdminActions;
  onClose: () => void;
}

function CategoryEditorModal({ original, categories, actions, onClose }: EditorProps) {
  const [label, setLabel] = useState(original?.label ?? '');
  const [slug, setSlug] = useState(original?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(original !== undefined);
  const [description, setDescription] = useState(original?.description ?? '');
  const [seoTitle, setSeoTitle] = useState(original?.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(original?.seo?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const others = categories.filter((c) => c.id !== original?.id);
  const effectiveSlug = slugTouched ? slugify(slug).slice(0, CATEGORY_LIMITS.slug) : categorySlugFromLabel(label);
  const postCount = original ? dataStorage.getNews().filter((n) => n.category === original.slug).length : 0;
  const slugChanged = original !== undefined && effectiveSlug !== original.slug;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const finalSlug = effectiveSlug || uniqueCategorySlug('', new Set(others.map((c) => c.slug)));
    const fields = { label, slug: finalSlug, description, seoTitle, seoDescription };
    const problem = categoryProblem(fields, others);
    if (problem) {
      setError(problem);
      return;
    }
    if (!original && categories.length >= CATEGORY_LIMITS.max) {
      setError(`Tối đa ${CATEGORY_LIMITS.max} danh mục.`);
      return;
    }
    const item = toCategory(original?.id ?? newId('cat'), original?.order ?? categories.length + 1, fields, nextOldSlugs(original, finalSlug));
    const list = original ? categories.map((c) => (c.id === original.id ? item : c)) : [...categories, item];
    const renamed = original !== undefined && (original.slug !== item.slug || original.label !== item.label);
    const news = renamed && postCount > 0 ? withCategory(dataStorage.getNews(), original.slug, item) : undefined;
    setSaving(true);
    const ok = await actions.attempt(() => dataStorage.saveNewsCategories(list, news));
    setSaving(false);
    if (!ok) return;
    actions.refresh();
    actions.notify(original ? `Đã cập nhật danh mục "${item.label}".` : `Đã thêm danh mục "${item.label}".`);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={original ? `Sửa danh mục: ${original.label}` : 'Thêm danh mục mới'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div role="alert" className="px-4 py-3 rounded-xl text-xs font-medium border bg-red-50 border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="cat-label" className="block font-semibold text-slate-700 mb-1">Tên danh mục (*)</label>
          <input
            id="cat-label"
            type="text"
            value={label}
            maxLength={CATEGORY_LIMITS.label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
            }}
            placeholder="VD: Thị trường"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="cat-slug" className="block font-semibold text-slate-700 mb-1">Đường dẫn (slug)</label>
          <input
            id="cat-slug"
            type="text"
            value={slugTouched ? slug : effectiveSlug}
            maxLength={CATEGORY_LIMITS.slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
              setError(null);
            }}
            placeholder="Tự tạo từ tên danh mục"
            className={`${INPUT} font-mono`}
          />
          <p className="mt-1 text-[11px] text-slate-500 break-all">
            Địa chỉ: <span className="font-mono">{categoryPath(effectiveSlug || '...')}</span>
          </p>
          {original && slugChanged && (
            <p role="alert" className="mt-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              Đổi đường dẫn: link cũ sẽ tự chuyển hướng 301 sang link mới. Link hiện tại:{' '}
              <span className="font-mono">{categoryPath(original.slug)}</span>.
              {postCount > 0 && ` ${postCount} bài viết sẽ tự chuyển sang đường dẫn mới.`}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cat-description" className="block font-semibold text-slate-700 mb-1">
            Mô tả ngắn <span className="font-normal text-slate-400">({description.length}/{CATEGORY_LIMITS.description})</span>
          </label>
          <textarea
            id="cat-description"
            rows={3}
            value={description}
            maxLength={CATEGORY_LIMITS.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hiển thị dưới tiêu đề trang danh mục và dùng làm mô tả SEO nếu không nhập mô tả SEO riêng."
            className={INPUT}
          />
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4 space-y-3">
          <legend className="px-1 font-semibold text-slate-700">SEO (tùy chọn)</legend>
          <div>
            <label htmlFor="cat-seo-title" className="block font-semibold text-slate-700 mb-1">Tiêu đề SEO</label>
            <input
              id="cat-seo-title"
              type="text"
              value={seoTitle}
              maxLength={CATEGORY_LIMITS.seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Để trống = tên danh mục + hậu tố trong Cài đặt > SEO"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="cat-seo-description" className="block font-semibold text-slate-700 mb-1">Mô tả SEO</label>
            <textarea
              id="cat-seo-description"
              rows={2}
              value={seoDescription}
              maxLength={CATEGORY_LIMITS.seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Để trống = dùng mô tả ngắn ở trên"
              className={INPUT}
            />
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? 'Đang lưu...' : original ? 'Lưu danh mục' : 'Thêm danh mục'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface DeleteProps {
  category: NewsCategoryItem;
  categories: NewsCategoryItem[];
  postCount: number;
  actions: AdminActions;
  onClose: () => void;
}

function DeleteCategoryModal({ category, categories, postCount, actions, onClose }: DeleteProps) {
  const others = categories.filter((c) => c.id !== category.id);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const blocked = postCount > 0 && (others.length === 0 || target === '');

  const handleDelete = async () => {
    if (blocked || saving) return;
    const destination = others.find((c) => c.slug === target);
    const news = postCount > 0 && destination ? withCategory(dataStorage.getNews(), category.slug, destination) : undefined;
    setSaving(true);
    const ok = await actions.attempt(() => dataStorage.saveNewsCategories(renumber(others), news));
    setSaving(false);
    if (!ok) return;
    actions.refresh();
    actions.notify(
      postCount > 0 && destination
        ? `Đã xóa danh mục "${category.label}" và chuyển ${postCount} bài viết sang "${destination.label}".`
        : `Đã xóa danh mục "${category.label}".`,
    );
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Xóa danh mục: ${category.label}`} size="md">
      <div className="space-y-4 text-xs">
        {postCount === 0 ? (
          <p className="text-slate-600">Danh mục này chưa có bài viết nào. Bạn có chắc chắn muốn xóa?</p>
        ) : (
          <>
            <p role="alert" className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-medium">
              Có {postCount} bài viết đang dùng danh mục này. Hãy chọn danh mục để chuyển các bài viết sang trước khi xóa.
            </p>
            {others.length === 0 ? (
              <p className="text-rose-700 font-semibold">Chưa có danh mục nào khác. Hãy tạo danh mục khác trước khi xóa danh mục này.</p>
            ) : (
              <div>
                <label htmlFor="cat-move-to" className="block font-semibold text-slate-700 mb-1">Chuyển bài viết sang</label>
                <select id="cat-move-to" value={target} onChange={(e) => setTarget(e.target.value)} className={`${INPUT} bg-white`}>
                  <option value="">-- Chọn danh mục --</option>
                  {others.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <button
            type="button"
            disabled={blocked || saving}
            onClick={handleDelete}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang xóa...' : postCount > 0 ? 'Chuyển bài viết và xóa' : 'Xóa danh mục'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface NewsCategoriesPanelProps {
  actions: AdminActions;
}

export function NewsCategoriesPanel({ actions }: NewsCategoriesPanelProps) {
  useDataListener();
  const [editor, setEditor] = useState<{ original?: NewsCategoryItem } | null>(null);
  const [deleting, setDeleting] = useState<NewsCategoryItem | null>(null);
  const categories = sortCategories(dataStorage.getNewsCategories());
  const counts = countByCategory(dataStorage.getNews());
  const knownSlugs = new Set(categories.map((c) => c.slug));
  const orphaned = Object.entries(counts).filter(([slug]) => !knownSlugs.has(slug));

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    if (!(await actions.attempt(() => dataStorage.saveNewsCategories(renumber(next))))) return;
    actions.refresh();
    actions.notify('Đã đổi thứ tự danh mục.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Danh Mục Tin Tức</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mỗi danh mục có trang riêng /tin-tuc/danh-muc/&lt;đường dẫn&gt; và hiện trong bộ lọc ở trang Tin tức. Tối đa {CATEGORY_LIMITS.max} danh mục.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="text-xs shadow-sm"
          disabled={categories.length >= CATEGORY_LIMITS.max}
          onClick={() => setEditor({})}
        >
          <Plus className="w-4 h-4 mr-1" />
          Thêm Danh Mục
        </Button>
      </div>

      {orphaned.length > 0 && (
        <p className="px-4 py-3 rounded-xl text-xs font-medium border bg-amber-50 border-amber-200 text-amber-800">
          Có bài viết thuộc danh mục không còn trong danh sách:{' '}
          {orphaned.map(([slug, n]) => `${slug} (${n})`).join(', ')}. Mở bài viết và chọn danh mục mới để hiển thị đúng.
        </p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Thứ tự</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Mô tả</th>
                <th className="py-3 px-4 text-center">Bài viết</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Chưa có danh mục nào. Bấm &quot;Thêm Danh Mục&quot; để tạo.
                  </td>
                </tr>
              )}
              {categories.map((category, index) => (
                <tr key={category.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Đưa ${category.label} lên`} className={ICON_BTN}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === categories.length - 1}
                        aria-label={`Đưa ${category.label} xuống`}
                        className={ICON_BTN}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-navy-900 text-sm">{category.label}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{categoryPath(category.slug)}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{category.description || '-'}</td>
                  <td className="py-3 px-4 text-center font-semibold text-navy-900">{counts[category.slug] ?? 0}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={categoryPath(category.slug)}
                        target="_blank"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                        title="Xem ngoài web"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditor({ original: category })}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        title="Chỉnh sửa"
                        aria-label={`Sửa danh mục ${category.label}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                        title="Xóa"
                        aria-label={`Xóa danh mục ${category.label}`}
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

      {editor && (
        <CategoryEditorModal
          key={editor.original?.id ?? 'new'}
          original={editor.original}
          categories={categories}
          actions={actions}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <DeleteCategoryModal
          category={deleting}
          categories={categories}
          postCount={counts[deleting.slug] ?? 0}
          actions={actions}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
