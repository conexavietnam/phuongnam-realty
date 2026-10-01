
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { FormInput } from '@/components/common/FormInput';
import { FormSelect } from '@/components/common/FormSelect';
import { FormTextarea } from '@/components/common/FormTextarea';
import { Button } from '@/components/common/Button';
import { companyService } from '@/services/companyService';

export function MobileConsignmentPage() {
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
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <FormInput label="Họ và tên (*)" placeholder="Nhập họ và tên" />
            <FormInput label="Số điện thoại (*)" placeholder="Nhập số điện thoại" type="tel" />
            <FormSelect 
              label="Nhu cầu (*)" 
              options={[
                { value: 'sell', label: 'Cần bán' },
                { value: 'rent', label: 'Cho thuê' }
              ]} 
            />
            <FormSelect 
              label="Khu vực" 
              options={[
                { value: 'ho-chi-minh', label: 'Hồ Chí Minh' },
                { value: 'binh-duong', label: 'Bình Dương' },
                { value: 'dong-nai', label: 'Đồng Nai' }
              ]} 
              placeholder="Chọn khu vực"
            />
            <FormSelect 
              label="Loại hình BĐS" 
              options={[
                { value: 'apartment', label: 'Căn hộ' },
                { value: 'house', label: 'Nhà phố' },
                { value: 'land', label: 'Đất nền' }
              ]} 
              placeholder="Chọn loại hình"
            />
            <FormInput label="Giá dự kiến" placeholder="VD: 3 Tỷ 500" />
            <FormTextarea label="Ghi chú thêm" placeholder="Thông tin thêm về BĐS của bạn..." />
            
            <Button variant="primary" className="w-full py-4 text-base mt-4">GỬI THÔNG TIN</Button>
          </form>
        </div>
      </div>
    </MobileLayout>
  );
}
