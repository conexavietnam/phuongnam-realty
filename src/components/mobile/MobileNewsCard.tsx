import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { CategoryChip } from '@/components/common/CategoryChip';
import { formatNewsDate } from '@/utils/newsMeta';

interface MobileNewsCardProps {
  article: NewsArticle;
}

export const MobileNewsCard: React.FC<MobileNewsCardProps> = ({ article }) => {
  return (
    <article className="relative flex bg-white rounded-xl shadow-sm overflow-hidden p-3 mb-3 border border-slate-100 active:scale-[0.98] transition-transform">
      <div className="relative shrink-0 w-28 h-20 bg-navy-950 rounded-lg overflow-hidden">
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="ml-3 flex flex-col justify-between flex-1 min-w-0 py-0.5">
        <div>
          <CategoryChip article={article} tone="light" size="sm" className="relative z-20 mb-1" />
          <h3 className="font-medium text-navy-900 text-sm leading-tight line-clamp-2">
            {/* The link stretches over the whole card; the category chip sits above it. */}
            <Link to={`/tin-tuc/${article.slug}`} className="after:absolute after:inset-0 after:z-10">
              {article.title}
            </Link>
          </h3>
        </div>

        <div className="flex items-center text-slate-400 text-[11px] mt-1">
          <Clock className="w-3 h-3 mr-1" />
          <span>{formatNewsDate(article.publishedAt)}</span>
          {article.readTime && (
            <>
              <span className="mx-1.5">•</span>
              <span>{article.readTime}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
