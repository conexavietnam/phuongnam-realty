import { useParams, Link } from 'react-router-dom';
import { Clock, Calendar, User, ArrowLeft, Share2 } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/common/Badge';
import { NewsCard } from '@/components/desktop/NewsCard';
import { SectionTitle } from '@/components/common/SectionTitle';
import { Button } from '@/components/common/Button';
import { newsService } from '@/services/newsService';

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? newsService.getBySlug(slug) : undefined;
  const relatedArticles = article ? newsService.getRelated(article.id, 3) : [];

  if (!article) {
    return (
      <DesktopLayout>
        <div className="py-24 text-center max-w-lg mx-auto px-4">
          <h1 className="text-4xl font-bold text-navy-900 mb-4">Không tìm thấy bài viết</h1>
          <p className="text-slate-500 mb-8">
            Bài viết bạn yêu cầu không tồn tại hoặc đã được chuyển sang địa chỉ khác.
          </p>
          <Link to="/tin-tuc">
            <Button variant="primary" size="md">Xem tất cả tin tức</Button>
          </Link>
        </div>
      </DesktopLayout>
    );
  }

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[160px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb
          items={[
            { label: 'Tin tức & Thị trường', path: '/tin-tuc' },
            { label: article.title },
          ]}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          <div className="mb-3">
            <Badge variant="gold">{article.categoryLabel}</Badge>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-4">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gold-400" />
              {article.author}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
              {formattedDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              {article.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured Image */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-lg mb-8 bg-slate-100">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Excerpt Lead */}
          <div className="p-6 bg-slate-50 border-l-4 border-gold-500 rounded-r-xl mb-8">
            <p className="text-navy-900 font-medium text-base sm:text-lg leading-relaxed italic">
              &ldquo;{article.excerpt}&rdquo;
            </p>
          </div>

          {/* Body Content */}
          <div className="prose prose-slate lg:prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
            {article.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-base sm:text-lg leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
            <Link to="/tin-tuc">
              <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Quay lại danh mục tin
              </Button>
            </Link>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: article.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Đã sao chép liên kết bài viết!');
                }
              }}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900 transition-colors p-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ bài viết</span>
            </button>
          </div>
        </div>
      </article>

      {/* Related News Section */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="CÙNG CHUYÊN MỤC"
            title="BÀI VIẾT LIÊN QUAN"
            description="Đón đọc các thông tin và bài viết phân tích thị trường mới nhất."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedArticles.map((item) => (
              <NewsCard key={item.id} article={item} />
            ))}
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
