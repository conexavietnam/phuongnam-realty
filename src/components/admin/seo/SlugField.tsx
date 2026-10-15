import { slugify } from '@/utils/slug';

interface SlugFieldProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  // Title used to generate the slug while the field is empty.
  title: string;
  // Public path before the slug, e.g. "/du-an/".
  prefix: string;
  // Slug stored on the server ('' for a new item).
  savedSlug: string;
  // True when the item is already live on the website.
  published: boolean;
  // Returns a Vietnamese error when the slug is taken by another item.
  conflict?: (slug: string) => string | null;
}

export const SLUG_CHANGE_WARNING = 'Đổi đường dẫn sẽ làm link cũ không còn truy cập được.';

// Slug input shared by the project, property, news and consignment editors.
// What gets saved is always slugify(typed text), or slugify(title) when left empty.
export function SlugField({ id, value, onChange, title, prefix, savedSlug, published, conflict }: SlugFieldProps) {
  const effective = slugify(value.trim() || title);
  const normalizedDiffers = value.trim() !== '' && effective !== value.trim();
  const changed = published && savedSlug !== '' && effective !== '' && effective !== savedSlug;
  const taken = effective ? conflict?.(effective) ?? null : null;

  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-slate-700 mb-1">Đường dẫn (slug)</label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Để trống để tự tạo từ tiêu đề"
        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
      />
      <p className="mt-1 text-[11px] text-slate-500 break-all">
        Địa chỉ: <span className="font-mono">{prefix}{effective || '...'}</span>
        {normalizedDiffers && <span className="ml-1 text-slate-400">(sẽ được lưu dạng không dấu, chữ thường)</span>}
      </p>
      {changed && (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
          {SLUG_CHANGE_WARNING} Link hiện tại: <span className="font-mono">{prefix}{savedSlug}</span>
        </p>
      )}
      {taken && (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
          {taken}
        </p>
      )}
    </div>
  );
}
