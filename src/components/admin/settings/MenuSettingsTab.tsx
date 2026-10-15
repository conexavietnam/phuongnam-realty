import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { MENU_ICONS } from '@/components/common/menuIcons';
import { MenuPreview } from '@/components/admin/settings/MenuPreview';
import { QuickLinkSelect } from '@/components/admin/settings/QuickLinkSelect';
import {
  blankBottom,
  blankChild,
  blankItem,
  pathHint,
  swap,
  toConfig,
  toDraft,
  validateDraft,
} from '@/components/admin/settings/menuDraft';
import type { DraftBottomItem, DraftChild, DraftItem, MenuDraft } from '@/components/admin/settings/menuDraft';
import { companyService } from '@/services/companyService';
import { useDataListener } from '@/hooks';
import { MENU_ICON_LABELS, MENU_ICON_NAMES, MENU_LIMITS, URL_HELP, isMenuIcon } from '@/utils/menuConfig';
import type { QuickLink } from '@/utils/menuQuickLinks';

const INPUT_CLASS = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500';
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-navy-900 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed';

interface RowToolsProps {
  label: string;
  index: number;
  count: number;
  visible: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}

// Up / down / hide / delete buttons shared by every kind of row.
function RowTools({ label, index, count, visible, onMove, onToggleVisible, onRemove }: RowToolsProps) {
  const name = label.trim() || `mục ${index + 1}`;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Chuyển ${name} lên`} className={ICON_BTN}>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Chuyển ${name} xuống`} className={ICON_BTN}>
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggleVisible}
        aria-pressed={!visible}
        aria-label={visible ? `Ẩn ${name}` : `Hiện ${name}`}
        title={visible ? 'Đang hiển thị. Bấm để ẩn' : 'Đang ẩn. Bấm để hiện'}
        className={`${ICON_BTN} ${visible ? '' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
      >
        {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      <button type="button" onClick={onRemove} aria-label={`Xóa ${name}`} className={`${ICON_BTN} hover:text-red-600`}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface LinkFieldsProps {
  where: string;
  label: string;
  path: string;
  onLabel: (value: string) => void;
  onPath: (value: string) => void;
  onPick: (link: QuickLink) => void;
}

function LinkFields({ where, label, path, onLabel, onPath, onPick }: LinkFieldsProps) {
  const hint = pathHint(path);
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
      <input
        type="text"
        value={label}
        maxLength={MENU_LIMITS.label + 20}
        onChange={(e) => onLabel(e.target.value)}
        placeholder="Tên hiển thị"
        aria-label={`${where}: tên hiển thị`}
        aria-invalid={label.trim().length > MENU_LIMITS.label}
        className={INPUT_CLASS}
      />
      <div>
        <input
          type="text"
          value={path}
          onChange={(e) => onPath(e.target.value)}
          placeholder="/du-an hoặc https://..."
          aria-label={`${where}: đường dẫn`}
          aria-invalid={hint !== null}
          className={`${INPUT_CLASS} font-mono ${hint ? 'border-rose-400' : ''}`}
        />
        {hint && <p className="mt-1 text-[11px] font-semibold text-rose-600">{hint} {URL_HELP}</p>}
      </div>
      <QuickLinkSelect onPick={onPick} ariaLabel={`${where}: chọn liên kết nhanh`} />
    </div>
  );
}

function NewTabCheckbox({ where, checked, onChange }: { where: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={`${where}: mở trong tab mới`} className="rounded border-slate-300" />
      Mở trong tab mới
    </label>
  );
}

export function MenuSettingsTab() {
  useDataListener();
  const [draft, setDraft] = useState<MenuDraft>(() => toDraft(companyService.getMenuConfig()));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const change = (next: MenuDraft) => {
    setDraft(next);
    setBanner(null);
  };

  const updateItem = (index: number, fn: (item: DraftItem) => DraftItem) =>
    change({ ...draft, desktop: draft.desktop.map((item, i) => (i === index ? fn(item) : item)) });
  const updateChild = (index: number, childIndex: number, patch: Partial<DraftChild>) =>
    updateItem(index, (item) => ({ ...item, children: item.children.map((c, j) => (j === childIndex ? { ...c, ...patch } : c)) }));
  const updateBottom = (index: number, patch: Partial<DraftBottomItem>) =>
    change({ ...draft, bottom: draft.bottom.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

  // Picking a quick link fills the path, and the name too when it is still empty.
  const pick = (label: string, link: QuickLink) => ({ path: link.path, ...(label.trim() === '' ? { label: link.label.slice(0, MENU_LIMITS.label) } : {}) });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateDraft(draft);
    if (problem) {
      setBanner({ kind: 'error', text: problem });
      return;
    }
    setSaving(true);
    try {
      const config = toConfig(draft);
      await companyService.saveNavigation(config);
      setDraft(toDraft(config));
      setBanner({ kind: 'success', text: 'Đã lưu menu thành công! Website cập nhật ngay, không cần tải lại trang.' });
    } catch (err) {
      setDraft(toDraft(companyService.getMenuConfig()));
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const restore = (part: 'desktop' | 'bottom') => {
    const defaults = toDraft(companyService.getDefaultNavigation());
    change({ ...draft, [part]: defaults[part] });
    setBanner({ kind: 'success', text: 'Đã khôi phục menu mặc định. Bấm "Lưu menu" để áp dụng.' });
  };

  const preview = toConfig(draft);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        <h3 className="text-base font-bold text-navy-900 mb-1">Menu Website</h3>
        <p className="text-xs text-slate-500 mb-4">
          Chỉnh menu trên đầu trang (máy tính), menu trượt (điện thoại) và thanh menu dưới (điện thoại). Có thể thêm, sửa, xóa, đổi thứ tự, ẩn/hiện, và thêm menu con một cấp.
          Địa chỉ hợp lệ: nội bộ bắt đầu bằng &quot;/&quot;, hoặc https://, mailto:, tel:.
        </p>
        <p className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
          <Info className="w-3.5 h-3.5 text-gold-500 shrink-0" />
          Chân trang chỉnh ở tab Chân trang. Menu trỏ tới trang không tồn tại vẫn hiển thị, nhưng khách sẽ thấy trang 404.
        </p>
      </div>

      {banner && (
        <div
          role={banner.kind === 'error' ? 'alert' : 'status'}
          className={`px-4 py-3 rounded-xl text-xs font-medium border ${
            banner.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      <section aria-labelledby="menu-desktop-title" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id="menu-desktop-title" className="font-bold text-sm text-navy-900">
            Menu website (desktop + drawer mobile) <span className="font-normal text-slate-400">({draft.desktop.length}/{MENU_LIMITS.items})</span>
          </h4>
          <button type="button" onClick={() => restore('desktop')} className="text-xs font-semibold text-slate-500 hover:text-navy-900">
            Khôi phục mặc định
          </button>
        </div>

        <ul className="space-y-3">
          {draft.desktop.map((item, index) => {
            const where = `Mục ${index + 1}`;
            return (
              <li key={item.key} className={`rounded-xl border p-3 space-y-3 ${item.visible ? 'border-slate-200' : 'border-amber-200 bg-amber-50/40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {where}
                    {!item.visible && <span className="ml-2 text-amber-700 normal-case">(đang ẩn)</span>}
                  </span>
                  <RowTools
                    label={item.label}
                    index={index}
                    count={draft.desktop.length}
                    visible={item.visible}
                    onMove={(delta) => change({ ...draft, desktop: swap(draft.desktop, index, delta) })}
                    onToggleVisible={() => updateItem(index, (i) => ({ ...i, visible: !i.visible }))}
                    onRemove={() => change({ ...draft, desktop: draft.desktop.filter((_, i) => i !== index) })}
                  />
                </div>

                <LinkFields
                  where={where}
                  label={item.label}
                  path={item.path}
                  onLabel={(label) => updateItem(index, (i) => ({ ...i, label }))}
                  onPath={(path) => updateItem(index, (i) => ({ ...i, path }))}
                  onPick={(link) => updateItem(index, (i) => ({ ...i, ...pick(i.label, link) }))}
                />
                <NewTabCheckbox where={where} checked={item.newTab} onChange={(newTab) => updateItem(index, (i) => ({ ...i, newTab }))} />

                {item.children.length > 0 && (
                  <ul className="ml-3 md:ml-6 space-y-2 border-l-2 border-gold-500/40 pl-3">
                    {item.children.map((child, childIndex) => {
                      const childWhere = `${where}, menu con ${childIndex + 1}`;
                      return (
                        <li key={child.key} className={`rounded-lg border p-2.5 space-y-2 ${child.visible ? 'border-slate-200' : 'border-amber-200 bg-amber-50/40'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-400">
                              Menu con {childIndex + 1}
                              {!child.visible && <span className="ml-2 text-amber-700">(đang ẩn)</span>}
                            </span>
                            <RowTools
                              label={child.label}
                              index={childIndex}
                              count={item.children.length}
                              visible={child.visible}
                              onMove={(delta) => updateItem(index, (i) => ({ ...i, children: swap(i.children, childIndex, delta) }))}
                              onToggleVisible={() => updateChild(index, childIndex, { visible: !child.visible })}
                              onRemove={() => updateItem(index, (i) => ({ ...i, children: i.children.filter((_, j) => j !== childIndex) }))}
                            />
                          </div>
                          <LinkFields
                            where={childWhere}
                            label={child.label}
                            path={child.path}
                            onLabel={(label) => updateChild(index, childIndex, { label })}
                            onPath={(path) => updateChild(index, childIndex, { path })}
                            onPick={(link) => updateChild(index, childIndex, pick(child.label, link))}
                          />
                          <NewTabCheckbox where={childWhere} checked={child.newTab} onChange={(newTab) => updateChild(index, childIndex, { newTab })} />
                        </li>
                      );
                    })}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => updateItem(index, (i) => ({ ...i, children: [...i.children, blankChild()] }))}
                  disabled={item.children.length >= MENU_LIMITS.children}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:text-gold-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm menu con ({item.children.length}/{MENU_LIMITS.children})
                </button>
              </li>
            );
          })}
          {draft.desktop.length === 0 && <li className="text-xs text-slate-400">Chưa có mục nào.</li>}
        </ul>

        <button
          type="button"
          onClick={() => change({ ...draft, desktop: [...draft.desktop, blankItem()] })}
          disabled={draft.desktop.length >= MENU_LIMITS.items}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-navy-900 hover:border-gold-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm mục menu ({draft.desktop.length}/{MENU_LIMITS.items})
        </button>
      </section>

      <section aria-labelledby="menu-bottom-title" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id="menu-bottom-title" className="font-bold text-sm text-navy-900">
            Thanh menu dưới (mobile) <span className="font-normal text-slate-400">({draft.bottom.length}/{MENU_LIMITS.bottom})</span>
          </h4>
          <button type="button" onClick={() => restore('bottom')} className="text-xs font-semibold text-slate-500 hover:text-navy-900">
            Khôi phục mặc định
          </button>
        </div>

        <ul className="space-y-3">
          {draft.bottom.map((item, index) => {
            const where = `Thanh dưới, mục ${index + 1}`;
            const Icon = MENU_ICONS[item.icon];
            return (
              <li key={item.key} className={`rounded-xl border p-3 space-y-3 ${item.visible ? 'border-slate-200' : 'border-amber-200 bg-amber-50/40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Icon className="w-4 h-4 text-gold-500" aria-hidden="true" />
                    Mục {index + 1}
                    {!item.visible && <span className="text-amber-700 normal-case">(đang ẩn)</span>}
                  </span>
                  <RowTools
                    label={item.label}
                    index={index}
                    count={draft.bottom.length}
                    visible={item.visible}
                    onMove={(delta) => change({ ...draft, bottom: swap(draft.bottom, index, delta) })}
                    onToggleVisible={() => updateBottom(index, { visible: !item.visible })}
                    onRemove={() => change({ ...draft, bottom: draft.bottom.filter((_, i) => i !== index) })}
                  />
                </div>
                <LinkFields
                  where={where}
                  label={item.label}
                  path={item.path}
                  onLabel={(label) => updateBottom(index, { label })}
                  onPath={(path) => updateBottom(index, { path })}
                  onPick={(link) => updateBottom(index, pick(item.label, link))}
                />
                <label className="flex items-center gap-2 text-[11px] text-slate-600 max-w-xs">
                  Biểu tượng
                  <select
                    value={item.icon}
                    onChange={(e) => isMenuIcon(e.target.value) && updateBottom(index, { icon: e.target.value })}
                    aria-label={`${where}: biểu tượng`}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    {MENU_ICON_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {MENU_ICON_LABELS[name]} ({name})
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            );
          })}
          {draft.bottom.length === 0 && <li className="text-xs text-slate-400">Chưa có mục nào.</li>}
        </ul>

        <button
          type="button"
          onClick={() => change({ ...draft, bottom: [...draft.bottom, blankBottom()] })}
          disabled={draft.bottom.length >= MENU_LIMITS.bottom}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-navy-900 hover:border-gold-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm mục thanh dưới ({draft.bottom.length}/{MENU_LIMITS.bottom})
        </button>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <MenuPreview desktop={preview.desktop} bottom={preview.mobileBottomNav} />
      </section>

      <Button type="submit" variant="primary" size="sm" disabled={saving} className="font-semibold text-xs py-2.5 px-6 shadow-sm">
        {saving ? 'ĐANG LƯU...' : 'LƯU MENU'}
      </Button>
    </form>
  );
}
