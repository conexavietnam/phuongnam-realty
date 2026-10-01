
import { Link } from 'react-router-dom';
import { MobileLayout } from '@/layouts/MobileLayout';
import { Button } from '@/components/common/Button';

export function MobileNotFoundPage() {
  return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <h1 className="text-6xl font-bold text-gold-500 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">Trang không tìm thấy</h2>
        <p className="text-slate-500 mb-8">Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
        <Link to="/">
          <Button variant="primary" className="w-full">Về trang chủ</Button>
        </Link>
      </div>
    </MobileLayout>
  );
}
