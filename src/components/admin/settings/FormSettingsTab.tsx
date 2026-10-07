import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { companyService } from '@/services/companyService';
import type { FilterConfig, FilterOption } from '@/types/common';

type GroupKey = keyof FilterConfig;

const GROUPS: Array<{ key: GroupKey; title: string; hint?: string }> = [
  { key: 'regions', title: 'Khu vực' },
  { key: 'propertyTypes', title: 'Loại BĐS' },
  {
    key: 'priceRanges',
    title: 'Mức giá',
    hint: 'Bộ lọc tìm kiếm BĐS chỉ nhận diện mã dạng "duoi-3-ty", "3-5-ty" (số-số-ty) hoặc "tren-20-ty". Mức giá có mã khác vẫn hiện trong form nhưng không lọc được BĐS.',
  },
];

const INPUT_CLASS = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs';
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-navy-900 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed';

function toValue(label: string): string {
  return label
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapOptions(config: FilterConfig, fn: (o: FilterOption) => FilterOption): FilterConfig {
  return {
    regions: config.regions.map(fn),
    propertyTypes: config.propertyTypes.map(fn),
    priceRanges: config.priceRanges.map(fn),
  };
}

function validate(config: FilterConfig): string | null {
  for (const { key, title } of GROUPS) {
    const seen = new Set<string>();
    for (const option of config[key]) {
      if (!option.label.trim()) return `Mục "${title}" có tên hiển thị để trống.`;
      if (seen.has(option.value)) return `Mục "${title}" có giá trị trùng lặp: "${option.label}".`;
      seen.add(option.value);
    }
  }
  return null;
}

export function FormSettingsTab() {
  const [draft, setDraft] = useState<FilterConfig>(() => mapOptions(companyService.getFilterConfig(), (o) => ({ ...o })));
  const [newLabels, setNewLabels] = useState<Record<GroupKey, string>>({ regions: '', propertyTypes: '', priceRanges: '' });
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const updateGroup = (key: GroupKey, options: FilterOption[]) => {
    setDraft((prev) => ({ ...prev, [key]: options }));
    setBanner(null);
  };

  const rename = (key: GroupKey, index: number, label: string) =>
    updateGroup(key, draft[key].map((o, i) => (i === index ? { ...o, label } : o)));

  const remove = (key: GroupKey, index: number) => updateGroup(key, draft[key].filter((_, i) => i !== index));

  const move = (key: GroupKey, index: number, delta: -1 | 1) => {
    const next = [...draft[key]];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateGroup(key, next);
  };

  const add = (key: GroupKey) => {
    const label = newLabels[key].trim();
    if (!label) {
      setBanner({ kind: 'error', text: 'Vui lòng nhập tên hiển thị trước khi thêm.' });
      return;
    }
    const value = toValue(label);
    if (!value || draft[key].some((o) => o.value === value)) {
      setBanner({ kind: 'error', text: `"${label}" bị trùng hoặc không tạo được mã hợp lệ (cần có chữ hoặc số).` });
      return;
    }
    updateGroup(key, [...draft[key], { value, label }]);
    setNewLabels((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(draft);
    if (problem) {
      setBanner({ kind: 'error', text: problem });
      return;
    }
    const trimmed = mapOptions(draft, (o) => ({ ...o, label: o.label.trim() }));
    setSaving(true);
    try {
      await companyService.saveFilterConfig(trimmed);
      setDraft(trimmed);
      setBanner({ kind: 'success', text: 'Đã lưu danh sách lựa chọn của form thành công!' });
    } catch (err) {
      setDraft(mapOptions(companyService.getFilterConfig(), (o) => ({ ...o })));
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        <h3 className="text-base font-bold text-navy-900 mb-1">Danh Sách Lựa Chọn Của Form</h3>
        <p className="text-xs text-slate-500 mb-4">
          Áp dụng cho form Ký gửi, form Liên hệ và bộ lọc tìm kiếm BĐS. Mã của mục đã có được giữ nguyên khi đổi tên để không ảnh hưởng dữ liệu cũ.
        </p>
        <p className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
          <Send className="w-3.5 h-3.5 text-gold-500 shrink-0" />
          Thông báo khách ký gửi được gửi tới Telegram quản trị (thay đổi ở tab Bảo mật).
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {GROUPS.map(({ key, title, hint }) => (
          <div key={key} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-3">
            <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider">{title}</h4>
            {hint && <p className="text-[11px] text-slate-500">{hint}</p>}

            <ul className="space-y-2">
              {draft[key].map((option, index) => (
                <li key={option.value} className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => rename(key, index, e.target.value)}
                      aria-label={`${title}: tên hiển thị của ${option.value}`}
                      className={INPUT_CLASS}
                    />
                    <span className="block text-[10px] font-mono text-slate-400 mt-0.5 truncate">{option.value}</span>
                  </div>
                  <button type="button" onClick={() => move(key, index, -1)} disabled={index === 0} aria-label="Chuyển lên" className={ICON_BTN}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(key, index, 1)}
                    disabled={index === draft[key].length - 1}
                    aria-label="Chuyển xuống"
                    className={ICON_BTN}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(key, index)} aria-label={`Xóa ${option.label}`} className={`${ICON_BTN} hover:text-red-600`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
              {draft[key].length === 0 && <li className="text-xs text-slate-400">Chưa có lựa chọn nào.</li>}
            </ul>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newLabels[key]}
                onChange={(e) => setNewLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add(key);
                  }
                }}
                placeholder="Thêm lựa chọn mới..."
                aria-label={`Thêm ${title}`}
                className={INPUT_CLASS}
              />
              <button type="button" onClick={() => add(key)} aria-label={`Thêm vào ${title}`} className={`${ICON_BTN} text-gold-600`}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider mb-3">Xem trước</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GROUPS.map(({ key, title }) => (
            <label key={key} className="block text-xs font-semibold text-slate-700">
              {title}
              <select className={`${INPUT_CLASS} mt-1 font-normal bg-white`} defaultValue="">
                <option value="">-- Chọn {title.toLowerCase()} --</option>
                {draft[key].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={saving} className="font-semibold text-xs py-2.5 px-6 shadow-sm">
        {saving ? 'ĐANG LƯU...' : 'LƯU DANH SÁCH LỰA CHỌN'}
      </Button>
    </form>
  );
}
