import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { NewsArticle } from '@/types';

interface MobileNewsCardProps {
  article: NewsArticle;
}

export const MobileNewsCard: React.FC<MobileNewsCardProps> = ({ article }) => {
  return (
    <Link 
      to={`/tin-tuc/${article.slug}`}
      className="flex bg-white rounded-xl shadow-sm overflow-hidden p-3 mb-3 border border-slate-100 active:scale-[0.98] transition-transform"
    >
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
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-navy-800 mb-1">
            {article.categoryLabel}
          </span>
          <h3 className="font-medium text-navy-900 text-sm leading-tight line-clamp-2">
            {article.title}
          </h3>
        </div>
        
        <div className="flex items-center text-slate-400 text-[11px] mt-1">
          <Clock className="w-3 h-3 mr-1" />
          <span>{article.publishedAt}</span>
          <span className="mx-1.5">•</span>
          <span>{article.readTime} đọc</span>
        </div>
      </div>
    </Link>
  );
};
