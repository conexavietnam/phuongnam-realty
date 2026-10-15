import { quickLinkGroups } from '@/utils/menuQuickLinks';
import type { QuickLink } from '@/utils/menuQuickLinks';

interface QuickLinkSelectProps {
  onPick: (link: QuickLink) => void;
  ariaLabel: string;
}

// "Chọn liên kết nhanh": pages, news categories, projects, properties and listings of the site.
// It only fills the path field; the select itself always goes back to its placeholder.
export function QuickLinkSelect({ onPick, ariaLabel }: QuickLinkSelectProps) {
  const groups = quickLinkGroups();
  return (
    <select
      value=""
      aria-label={ariaLabel}
      onChange={(e) => {
        const path = e.target.value;
        const link = groups.flatMap((g) => g.links).find((l) => l.path === path);
        if (link) onPick(link);
      }}
      className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-600"
    >
      <option value="">Chọn liên kết nhanh</option>
      {groups.map((group) => (
        <optgroup key={group.title} label={group.title}>
          {group.links.map((link) => (
            <option key={`${group.title}:${link.path}`} value={link.path}>
              {link.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
