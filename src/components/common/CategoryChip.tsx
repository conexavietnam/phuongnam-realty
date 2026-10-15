import { Link } from 'react-router-dom';
import { newsService } from '@/services/newsService';
import { categoryPath } from '@/utils/newsMeta';
import type { NewsArticle } from '@/types';

interface CategoryChipProps {
  article: Pick<NewsArticle, 'category' | 'categoryLabel'>;
  // 'overlay' sits on a card image, 'inline' flows with the text.
  placement?: 'overlay' | 'inline';
  tone?: 'navy' | 'gold' | 'light';
  size?: 'md' | 'sm';
  className?: string;
}

const TONES = {
  navy: 'bg-navy-900 text-white hover:bg-navy-800',
  gold: 'bg-gold-500 text-white hover:bg-gold-600',
  light: 'bg-slate-100 text-navy-800 hover:bg-slate-200',
};

// Category label of an article. Links to the category page when the category is in the list;
// an old article whose category was removed shows plain text.
export function CategoryChip({ article, placement = 'inline', tone = 'navy', size = 'md', className = '' }: CategoryChipProps) {
  const known = newsService.getCategory(article.category);
  const label = newsService.getCategoryLabel(article as NewsArticle);
  const base = `inline-block transition-colors ${
    size === 'sm' ? 'px-1.5 py-0.5 rounded text-[9px] font-medium' : 'px-3 py-1 rounded-full text-xs font-semibold shadow-sm'
  } ${placement === 'overlay' ? 'absolute top-4 left-4 z-20' : ''} ${TONES[tone]} ${className}`;
  if (!known) return <span className={base}>{label}</span>;
  return (
    <Link to={categoryPath(known.slug)} className={base}>
      {label}
    </Link>
  );
}
