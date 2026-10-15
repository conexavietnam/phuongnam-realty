import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { CategoryChip } from '@/components/common/CategoryChip';
import { stripHtml } from '@/utils/richText';
import { formatNewsDate } from '@/utils/newsMeta';

export interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col h-full">
      {/* Thumbnail with Category Badge */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-navy-950">
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <CategoryChip article={article} placement="overlay" />
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Clock className="w-3.5 h-3.5 text-gold-500" />
            <span>{formatNewsDate(article.publishedAt)}</span>
            {article.readTime && (
              <>
                <span aria-hidden="true">•</span>
                <span>{article.readTime}</span>
              </>
            )}
          </div>

          <h3 className="font-semibold text-base text-navy-900 group-hover:text-gold-500 transition-colors line-clamp-2 mb-2 leading-snug">
            {/* The link stretches over the whole card; the category chip sits above it. */}
            <Link to={`/tin-tuc/${article.slug}`} className="after:absolute after:inset-0 after:z-10">
              {article.title}
            </Link>
          </h3>

          <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-4">
            {stripHtml(article.excerpt)}
          </p>
        </div>

        {/* Read more Link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-gold-500 group-hover:text-gold-600 transition-colors">
          <span>Đọc tiếp</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </article>
  );
}
