import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { Badge } from '@/components/common/Badge';

export interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <Link
      to={`/tin-tuc/${article.slug}`}
      className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col h-full"
    >
      {/* Thumbnail with Category Badge */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <Badge variant="navy">
          {article.categoryLabel}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          {/* Metadata */}
          {article.readTime && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <Clock className="w-3.5 h-3.5 text-gold-500" />
              <span>{article.readTime}</span>
            </div>
          )}

          <h3 className="font-semibold text-base text-navy-900 group-hover:text-gold-500 transition-colors line-clamp-2 mb-2 leading-snug">
            {article.title}
          </h3>

          <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-4">
            {article.excerpt}
          </p>
        </div>

        {/* Read more Link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-gold-500 group-hover:text-gold-600 transition-colors">
          <span>Đọc tiếp</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
