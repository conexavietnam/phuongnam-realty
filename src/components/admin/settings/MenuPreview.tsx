import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MENU_ICONS } from '@/components/common/menuIcons';
import { renderableBottom, renderableNav } from '@/utils/menuConfig';
import type { MenuItem } from '@/types/common';

interface MenuPreviewProps {
  desktop: MenuItem[];
  bottom: MenuItem[];
}

// Static look-alike of the header (with its dropdown) and of the phone bottom bar. Nothing here navigates.
export function MenuPreview({ desktop, bottom }: MenuPreviewProps) {
  const nav = renderableNav(desktop);
  const bar = renderableBottom(bottom);
  const [picked, setPicked] = useState<string | null>(null);
  // Without a choice the first item with a submenu is shown open.
  const openId = picked ?? nav.find((item) => item.children.length > 0)?.id ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
      <div>
        <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider mb-2">Xem trước menu website</h4>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 pt-3 pb-3 min-h-[11rem]" data-testid="preview-header">
          <div className="flex items-center gap-6 overflow-x-auto">
            <span className="shrink-0 text-sm font-extrabold text-navy-900 tracking-wide">LOGO</span>
            <ul className="flex items-center gap-5 text-sm">
              {nav.map((item, index) => (
                <li key={item.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPicked(item.children.length > 0 && openId === item.id ? '' : item.id)}
                    className={`inline-flex items-center gap-1 py-1.5 ${index === 0 ? 'text-gold-500 font-semibold border-b-2 border-gold-500' : 'text-navy-800'}`}
                  >
                    {item.label}
                    {item.children.length > 0 && <ChevronDown className={`w-3.5 h-3.5 ${openId === item.id ? 'rotate-180' : ''}`} />}
                  </button>
                  {item.children.length > 0 && openId === item.id && (
                    <ul className="absolute left-0 top-full z-10 mt-1 min-w-[11rem] rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg" data-testid="preview-dropdown">
                      {item.children.map((child) => (
                        <li key={child.id} className="px-3.5 py-1.5 text-xs text-navy-800 whitespace-nowrap">
                          {child.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {nav.length === 0 && <li className="text-xs text-slate-400">Chưa có mục hiển thị.</li>}
            </ul>
          </div>
          <p className="mt-16 text-[11px] text-slate-400">Bấm vào mục có mũi tên để xem menu con. Mục ẩn hoặc có đường dẫn chưa hợp lệ sẽ không hiện.</p>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider mb-2">Xem trước thanh menu dưới (điện thoại)</h4>
        <div className="mx-auto max-w-[375px] rounded-2xl border border-slate-200 bg-slate-100 pt-16 overflow-hidden" data-testid="preview-bottom">
          <div className="flex h-16 items-center justify-around bg-white px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
            {bar.map((item, index) => {
              const Icon = MENU_ICONS[item.icon];
              return (
                <span key={item.id} className={`flex w-full flex-col items-center justify-center space-y-1 ${index === 0 ? 'text-gold-500' : 'text-slate-400'}`}>
                  <Icon className="w-6 h-6" />
                  <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">{item.label}</span>
                </span>
              );
            })}
            {bar.length === 0 && <span className="text-xs text-slate-400">Chưa có mục hiển thị.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
