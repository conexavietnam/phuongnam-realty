import { Link } from 'react-router-dom';
import { newsService } from '@/services/newsService';
import { categoryPath } from '@/utils/newsMeta';

interface NewsCategoryTabsProps {
  // Slug of the category page being shown; undefined on /tin-tuc ("Tất cả").
  activeSlug?: string;
  compact?: boolean;
}

// Filter tabs for the news list: real links, so every category page is reachable and crawlable.
// Categories without articles are hidden unless they are the one being viewed.
export function NewsCategoryTabs({ activeSlug, compact = false }: NewsCategoryTabsProps) {
  const counts = newsService.getCategoryCounts();
  const total = newsService.getAll().length;
  const categories = newsService.getCategories().filter((c) => (counts[c.slug] ?? 0) > 0 || c.slug === activeSlug);

  const tab = (active: boolean) =>
    `shrink-0 inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors whitespace-nowrap ${
      compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
    } ${
      active
        ? 'bg-navy-900 border-navy-900 text-gold-400'
        : 'bg-white border-slate-200 text-navy-800 hover:border-gold-500 hover:text-gold-600'
    }`;
  const count = (n: number) => <span className="text-[0.85em] font-medium opacity-70">({n})</span>;

  return (
    <nav aria-label="Chuyên mục tin tức" className="overflow-x-auto">
      <ul className="flex gap-2 pb-1">
        <li>
          <Link to="/tin-tuc" className={tab(!activeSlug)} aria-current={!activeSlug ? 'page' : undefined}>
            Tất cả {count(total)}
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link to={categoryPath(c.slug)} className={tab(c.slug === activeSlug)} aria-current={c.slug === activeSlug ? 'page' : undefined}>
              {c.label} {count(counts[c.slug] ?? 0)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
