import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Button } from '@/components/common/Button';

export function NotFoundPage() {
  return (
    <DesktopLayout>
      <div className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-slate-50">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-2xl shadow-lg border border-slate-100">
          <div className="text-8xl font-black text-navy-900 tracking-tight mb-2">
            404
          </div>
          <div className="h-1.5 w-16 bg-gold-500 mx-auto rounded-full mb-6" />
          <h1 className="text-2xl font-bold text-navy-900 mb-3">
            Trang không tìm thấy
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Trang bạn đang cố gắng truy cập không tồn tại hoặc đã được di chuyển sang một liên kết khác. Vui lòng kiểm tra lại đường dẫn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                icon={<Home className="w-4 h-4" />}
                className="w-full font-semibold shadow-md shadow-gold-500/20"
              >
                Về trang chủ
              </Button>
            </Link>
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                size="md"
                icon={<ArrowLeft className="w-4 h-4" />}
                className="w-full font-semibold"
              >
                Quay lại
              </Button>
            </button>
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}
