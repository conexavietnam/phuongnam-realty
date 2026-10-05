
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { ConsignmentForm } from '@/components/desktop/ConsignmentForm';
import { companyService } from '@/services/companyService';
import { useDataListener } from '@/hooks';

export function MobileConsignmentPage() {
  useDataListener();
  const consignments = companyService.getConsignments();

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-navy-900 mb-3">Ký gửi BĐS</h1>
        <p className="text-slate-600 text-sm mb-6">
          Gửi thông tin bất động sản của bạn cho chúng tôi. Đội ngũ chuyên gia sẽ liên hệ tư vấn trong thời gian sớm nhất.
        </p>
      </div>

      {/* Consignment Projects */}
      <div className="mb-8">
        <h2 className="px-4 font-bold text-navy-900 mb-4 border-l-4 border-gold-500 pl-2 ml-4">Dự án nhận ký gửi</h2>
        <div className="flex overflow-x-auto gap-4 px-4 scrollbar-hide pb-2">
          {consignments.map((item) => (
            <div key={item.slug} className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex gap-3 p-3">
                <img src={item.thumbnail} alt={item.name} className="w-20 h-20 object-cover rounded aspect-square" />
                <div className="flex flex-col justify-center">
                  <h3 className="font-bold text-navy-900 text-sm mb-1">{item.name}</h3>
                  <div className="flex items-center gap-1 text-slate-500 mb-2">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="text-xs truncate">{item.location}</span>
                  </div>
                  <Link to={`/du-an/${item.slug}`} className="text-gold-500 text-xs font-medium">Xem chi tiết &rarr;</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="px-4 pb-8">
        <ConsignmentForm />
      </div>
    </MobileLayout>
  );
}
