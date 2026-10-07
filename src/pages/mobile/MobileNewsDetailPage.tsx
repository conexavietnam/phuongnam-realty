
import { useParams } from 'react-router-dom';
import { Calendar, User, Clock } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileNewsCard } from '@/components/mobile/MobileNewsCard';
import { MobileNotFoundPage } from './MobileNotFoundPage';
import { newsService } from '@/services/newsService';
import { Badge } from '@/components/common/Badge';
import { renderRichHtml } from '@/utils/richText';

export function MobileNewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const newsItem = newsService.getBySlug(slug || '');

  if (!newsItem) return <MobileNotFoundPage />;

  const relatedNews = newsService.getFeatured(3).filter(n => n.id !== newsItem.id).slice(0, 2);

  return (
    <MobileLayout>
      <div className="px-4 py-6">
        <Badge variant="navy" className="mb-4 relative top-0 left-0">{newsItem.category}</Badge>
        <h1 className="text-xl font-bold text-navy-900 mb-4 leading-tight">{newsItem.title}</h1>
        
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{newsItem.publishedAt}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{newsItem.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{newsItem.readTime}</span>
          </div>
        </div>

        <img 
          src={newsItem.thumbnail} 
          alt={newsItem.title} 
          className="w-full h-48 object-cover rounded-lg mb-6"
        />

        <div 
          className="rich-content text-sm mb-10"
          dangerouslySetInnerHTML={{ __html: renderRichHtml(newsItem.content) }}
        />

        <div className="border-t border-slate-100 pt-6">
          <h2 className="font-bold text-navy-900 mb-4 border-l-4 border-gold-500 pl-2">Tin tức liên quan</h2>
          <div className="flex flex-col gap-4">
            {relatedNews.map(item => (
              <MobileNewsCard key={item.id} article={item} />
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
