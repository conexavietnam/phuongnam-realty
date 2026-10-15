import { collapseSpaces } from '@/utils/seo';

interface SerpPreviewProps {
  title: string;
  // e.g. "phuongnamrealty.vn"
  host: string;
  // path segments after the host, e.g. ["du-an", "palm-river"]
  segments: string[];
  description: string;
}

// Google shows roughly 60 title characters and 160 description characters before cutting with "…".
function clip(text: string, max: number): string {
  const chars = Array.from(collapseSpaces(text));
  return chars.length > max ? chars.slice(0, max).join('').trimEnd() + '…' : chars.join('');
}

export function SerpPreview({ title, host, segments, description }: SerpPreviewProps) {
  const crumbs = [host, ...segments.filter(Boolean)].join(' › ');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Xem trước kết quả Google">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Xem trước trên Google</p>
      <p className="text-[12px] text-slate-600 break-all">{crumbs}</p>
      <p className="text-[18px] leading-snug text-[#1a0dab] font-normal break-words">{clip(title, 60) || 'Tiêu đề trang'}</p>
      <p className="text-[13px] leading-snug text-slate-600 break-words">{clip(description, 160) || 'Mô tả trang sẽ hiển thị ở đây.'}</p>
    </div>
  );
}
