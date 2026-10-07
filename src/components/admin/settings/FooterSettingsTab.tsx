import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { companyService } from '@/services/companyService';
import { classifyFooterUrl } from '@/utils/footerLinks';
import type { FooterConfig } from '@/types/common';

const MAX_COLUMNS = 4;
const MAX_LINKS = 12;

interface DraftLink {
  key: string;
  label: string;
  url: string;
}

interface DraftColumn {
  id: string;
  title: string;
  links: DraftLink[];
}

interface Draft {
  columns: DraftColumn[];
  copyright: string;
}

const INPUT_CLASS = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs';
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-navy-900 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed';

let keyCounter = 0;
const nextKey = (): string => `k${Date.now().toString(36)}${keyCounter++}`;

function toDraft(config: FooterConfig): Draft {
  return {
    copyright: config.copyright,
    columns: config.columns.map((c) => ({
      id: c.id,
      title: c.title,
      links: c.links.map((l) => ({ key: nextKey(), label: l.label, url: l.url })),
    })),
  };
}

function toConfig(draft: Draft): FooterConfig {
  return {
    copyright: draft.copyright.trim(),
    columns: draft.columns.map((c) => ({
      id: c.id,
      title: c.title.trim(),
      links: c.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    })),
  };
}

function validate(draft: Draft): string | null {
  if (!draft.copyright.trim()) return 'Vui lòng nhập nội dung bản quyền.';
  const titles = new Set<string>();
  for (const [ci, column] of draft.columns.entries()) {
    const title = column.title.trim();
    if (!title) return `Cột ${ci + 1} chưa có tiêu đề.`;
    if (titles.has(title.toLowerCase())) return `Tiêu đề cột bị trùng: "${title}".`;
    titles.add(title.toLowerCase());
    const urls = new Set<string>();
    for (const link of column.links) {
      const label = link.label.trim();
      const url = link.url.trim();
      if (!label) return `Cột "${title}" có liên kết chưa có tên hiển thị.`;
      if (!classifyFooterUrl(url)) {
        return `Cột "${title}": liên kết "${label}" không hợp lệ. Chỉ nhận đường dẫn nội bộ bắt đầu bằng "/", https://, mailto: hoặc tel:.`;
      }
      if (urls.has(url)) return `Cột "${title}" có liên kết trùng địa chỉ: ${url}.`;
      urls.add(url);
    }
  }
  return null;
}

export function FooterSettingsTab() {
  const [draft, setDraft] = useState<Draft>(() => toDraft(companyService.getFooterConfig()));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const change = (next: Draft) => {
    setDraft(next);
    setBanner(null);
  };

  const updateColumn = (index: number, fn: (c: DraftColumn) => DraftColumn) =>
    change({ ...draft, columns: draft.columns.map((c, i) => (i === index ? fn(c) : c)) });

  const updateLink = (ci: number, li: number, patch: Partial<DraftLink>) =>
    updateColumn(ci, (c) => ({ ...c, links: c.links.map((l, i) => (i === li ? { ...l, ...patch } : l)) }));

  const swap = <T,>(list: T[], index: number, delta: -1 | 1): T[] => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const addColumn = () =>
    change({
      ...draft,
      columns: [...draft.columns, { id: `col-${nextKey()}`, title: '', links: [] }],
    });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(draft);
    if (problem) {
      setBanner({ kind: 'error', text: problem });
      return;
    }
    setSaving(true);
    try {
      const config = toConfig(draft);
      await companyService.saveFooterConfig(config);
      setDraft(toDraft(config));
      setBanner({ kind: 'success', text: 'Đã lưu nội dung chân trang thành công!' });
    } catch (err) {
      setDraft(toDraft(companyService.getFooterConfig()));
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    setDraft(toDraft(companyService.getDefaultFooterConfig()));
    setBanner({ kind: 'success', text: 'Đã khôi phục nội dung mặc định. Bấm "Lưu" để áp dụng.' });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        <h3 className="text-base font-bold text-navy-900 mb-1">Liên Kết Chân Trang</h3>
        <p className="text-xs text-slate-500 mb-4">
          Các cột liên kết và dòng bản quyền hiển thị ở cuối mọi trang trên máy tính. Tối đa {MAX_COLUMNS} cột, mỗi cột tối đa {MAX_LINKS} liên kết.
          Địa chỉ đường dẫn hợp lệ: nội bộ bắt đầu bằng "/", hoặc https://, mailto:, tel:.
        </p>
        <p className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
          <Info className="w-3.5 h-3.5 text-gold-500 shrink-0" />
          Địa chỉ, hotline, email, mạng xã hội chỉnh ở tab Thông tin Website.
        </p>
      </div>

      {banner && (
        <div
          role={banner.kind === 'error' ? 'alert' : 'status'}
          className={`px-4 py-3 rounded-xl text-xs font-medium border ${
            banner.kind === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {draft.columns.map((column, ci) => (
          <div key={column.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={column.title}
                onChange={(e) => updateColumn(ci, (c) => ({ ...c, title: e.target.value }))}
                placeholder="Tiêu đề cột"
                aria-label={`Tiêu đề cột ${ci + 1}`}
                className={`${INPUT_CLASS} font-semibold`}
              />
              <button type="button" onClick={() => change({ ...draft, columns: swap(draft.columns, ci, -1) })} disabled={ci === 0} aria-label="Chuyển cột sang trước" className={ICON_BTN}>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => change({ ...draft, columns: swap(draft.columns, ci, 1) })}
                disabled={ci === draft.columns.length - 1}
                aria-label="Chuyển cột ra sau"
                className={ICON_BTN}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => change({ ...draft, columns: draft.columns.filter((_, i) => i !== ci) })}
                aria-label={`Xóa cột ${column.title || ci + 1}`}
                className={`${ICON_BTN} hover:text-red-600`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <ul className="space-y-2">
              {column.links.map((link, li) => (
                <li key={link.key} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(ci, li, { label: e.target.value })}
                    placeholder="Tên hiển thị"
                    aria-label={`Cột ${ci + 1}, liên kết ${li + 1}: tên hiển thị`}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink(ci, li, { url: e.target.value })}
                    placeholder="/du-an hoặc https://..."
                    aria-label={`Cột ${ci + 1}, liên kết ${li + 1}: địa chỉ`}
                    className={`${INPUT_CLASS} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => updateColumn(ci, (c) => ({ ...c, links: swap(c.links, li, -1) }))}
                    disabled={li === 0}
                    aria-label="Chuyển liên kết lên"
                    className={ICON_BTN}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateColumn(ci, (c) => ({ ...c, links: swap(c.links, li, 1) }))}
                    disabled={li === column.links.length - 1}
                    aria-label="Chuyển liên kết xuống"
                    className={ICON_BTN}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateColumn(ci, (c) => ({ ...c, links: c.links.filter((_, i) => i !== li) }))}
                    aria-label={`Xóa liên kết ${link.label || li + 1}`}
                    className={`${ICON_BTN} hover:text-red-600`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
              {column.links.length === 0 && <li className="text-xs text-slate-400">Chưa có liên kết nào.</li>}
            </ul>

            <button
              type="button"
              onClick={() => updateColumn(ci, (c) => ({ ...c, links: [...c.links, { key: nextKey(), label: '', url: '' }] }))}
              disabled={column.links.length >= MAX_LINKS}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:text-gold-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm liên kết ({column.links.length}/{MAX_LINKS})
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addColumn}
        disabled={draft.columns.length >= MAX_COLUMNS}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-navy-900 hover:border-gold-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm cột ({draft.columns.length}/{MAX_COLUMNS})
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="footer-copyright">
          Dòng bản quyền
        </label>
        <input
          id="footer-copyright"
          type="text"
          value={draft.copyright}
          onChange={(e) => change({ ...draft, copyright: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>

      <div className="rounded-2xl bg-navy-900 text-slate-300 p-5">
        <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-4">Xem trước</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {draft.columns.map((column) => (
            <div key={column.id}>
              <p className="text-white font-medium text-sm mb-3">{column.title || '(chưa có tiêu đề)'}</p>
              <ul className="space-y-2 text-xs">
                {column.links.map((link) => (
                  <li key={link.key} className={classifyFooterUrl(link.url) && link.label.trim() ? '' : 'text-red-400'}>
                    {link.label.trim() || '(chưa có tên)'}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="border-t border-white/10 mt-5 pt-3 text-xs text-slate-400">{draft.copyright}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={saving} className="font-semibold text-xs py-2.5 px-6 shadow-sm">
          {saving ? 'ĐANG LƯU...' : 'LƯU CHÂN TRANG'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleRestoreDefaults} className="font-semibold text-xs py-2.5 px-4">
          Khôi phục mặc định
        </Button>
      </div>
    </form>
  );
}
