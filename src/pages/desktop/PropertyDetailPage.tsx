import { useParams, Link } from 'react-router-dom';
import { MapPin, CheckCircle2, Shield, Award, Users, Clock } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ImageGallery } from '@/components/desktop/ImageGallery';
import { AgentCard } from '@/components/desktop/AgentCard';
import { PropertyCard } from '@/components/desktop/PropertyCard';
import { SectionTitle } from '@/components/common/SectionTitle';
import { Button } from '@/components/common/Button';
import { propertyService } from '@/services/propertyService';
import { companyService } from '@/services/companyService';
import { renderRichHtml } from '@/utils/richText';

const BENEFITS = [
  { icon: Shield, title: 'Pháp Lý An Toàn 100%', desc: 'Đội ngũ pháp lý kiểm tra quy hoạch và hồ sơ kỹ lưỡng trước khi bàn giao.' },
  { icon: Award, title: 'Giá Chuẩn Từ Chính Chủ', desc: 'Cam kết giá bán niêm yết đúng thực tế từ chủ nhà, hỗ trợ thương lượng trực tiếp.' },
  { icon: Users, title: 'Chuyên Viên Tận Tâm', desc: 'Đồng hành cùng quý khách từ khảo sát, đàm phán hợp đồng tới khi bàn giao nhà.' },
  { icon: Clock, title: 'Giao Dịch Nhanh Chóng', desc: 'Hỗ trợ thủ tục công chứng, hồ sơ vay vốn ngân hàng lãi suất ưu đãi trong 24h.' },
];

export function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const property = slug ? propertyService.getBySlug(slug) : undefined;
  const agent = property?.agentId ? companyService.getAgentById(property.agentId) : companyService.getAgents()[0];
  const relatedProperties = property ? propertyService.getRelated(property.id, 3) : [];

  if (!property) {
    return (
      <DesktopLayout>
        <div className="py-24 text-center max-w-lg mx-auto px-4">
          <h1 className="text-4xl font-bold text-navy-900 mb-4">Không tìm thấy bất động sản</h1>
          <p className="text-slate-500 mb-8">Bất động sản bạn tìm kiếm có thể đã được giao dịch hoặc không còn khả dụng.</p>
          <Link to="/chuyen-nhuong">
            <Button variant="primary" size="md">Xem BĐS chuyển nhượng khác</Button>
          </Link>
        </div>
      </DesktopLayout>
    );
  }

  // Listings promoted from Ký gửi may lack some facts: empty rows are hidden instead of filled with defaults.
  const promoted = property.consignmentStatus !== undefined;
  const specsTable = [
    { label: 'Mã BĐS', value: property.id },
    { label: 'Loại hình', value: property.category },
    { label: 'Vị trí', value: property.location },
    { label: 'Diện tích', value: property.area > 0 ? `${property.area} m²` : '' },
    { label: 'Phòng ngủ', value: property.bedrooms > 0 || !promoted ? `${property.bedrooms} PN` : '' },
    { label: 'Phòng tắm', value: property.bathrooms > 0 || !promoted ? `${property.bathrooms} WC` : '' },
    { label: 'Tầng / Vị trí', value: property.floor || (promoted ? '' : 'Căn tầng đẹp') },
    { label: 'Hướng nhà', value: property.direction || (promoted ? '' : 'Đông Nam') },
    { label: 'Tầm nhìn', value: property.view || (promoted ? '' : 'Thoáng đãng') },
    { label: 'Pháp lý', value: property.legal },
  ].filter((row) => row.value !== '');

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[160px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'Chuyển nhượng', path: '/chuyen-nhuong' }, { label: property.title }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          {property.consignmentStatus === 'sold' && (
            <span className="inline-block mb-2 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">Đã giao dịch</span>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">{property.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gold-500" />{property.location}</span>
            <span>•</span><span className="text-gold-400 font-bold">{property.priceDisplay}</span>
            {property.area > 0 && (<><span>•</span><span>{property.area} m²</span></>)}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-7"><ImageGallery images={property.images} /></div>
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Mức giá chuyển nhượng</span>
                <div className="text-3xl font-extrabold text-gold-500 mb-4">{property.priceDisplay}</div>
                <div className="grid grid-cols-2 gap-3 text-sm py-4 border-t border-slate-200">
                  {property.area > 0 && <div><span className="text-slate-400 block text-xs">Diện tích</span><span className="font-semibold text-navy-900">{property.area} m²</span></div>}
                  {(property.bedrooms > 0 || !promoted) && <div><span className="text-slate-400 block text-xs">Phòng ngủ</span><span className="font-semibold text-navy-900">{property.bedrooms} PN</span></div>}
                  {(property.bathrooms > 0 || !promoted) && <div><span className="text-slate-400 block text-xs">Phòng tắm</span><span className="font-semibold text-navy-900">{property.bathrooms} WC</span></div>}
                  {(property.direction || !promoted) && <div><span className="text-slate-400 block text-xs">Hướng nhà</span><span className="font-semibold text-navy-900">{property.direction || 'Đông Nam'}</span></div>}
                </div>
                {property.legal && (
                  <div className="mt-2 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>Pháp lý:</span>
                    <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{property.legal}</span>
                  </div>
                )}
              </div>
              {agent && <AgentCard agent={agent} />}
            </div>
          </div>

          {/* Specs Table */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-navy-900 mb-6 pb-2 border-b border-slate-100">THÔNG TIN CHI TIẾT</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm">
              {specsTable.map((spec, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-200/60 last:border-b-0">
                  <span className="text-slate-500">{spec.label}</span>
                  <span className="font-semibold text-navy-900">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-navy-900 mb-6 pb-2 border-b border-slate-100">MÔ TẢ CHI TIẾT</h2>
            <div
              className="rich-content text-base mb-6"
              dangerouslySetInnerHTML={{ __html: renderRichHtml(property.fullDescription) }}
            />
            <div className="space-y-3">
              {[
                'Vị trí đắc địa, thuận tiện kết nối giao thông trung tâm',
                'Không gian sống văn minh, an ninh nghiêm ngặt 24/7',
                'Hệ thống tiện ích nội khu đầy đủ: Hồ bơi, Gym, Công viên, Trường học',
                'Hồ sơ pháp lý đầy đủ, sẵn sàng ký công chứng sang tên ngay',
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-gold-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-16">
            <SectionTitle subtitle="CAM KẾT DỊCH VỤ" title="TẠI SAO NÊN CHỌN PHƯƠNG NAM REALTY?" centered />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {BENEFITS.map((b, i) => {
                const IconComponent = b.icon;
                return (
                  <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center flex flex-col items-center">
                    <div className="p-3 bg-white rounded-xl shadow-sm mb-4"><IconComponent className="w-8 h-8 text-gold-500" /></div>
                    <h3 className="font-bold text-navy-900 text-base mb-2">{b.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Similar Properties */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle subtitle="GỢI Ý THÊM" title="DỰ ÁN TƯƠNG TỰ" description="Các bất động sản có cùng phân khúc và vị trí để bạn dễ dàng so sánh." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProperties.map((prop) => (<PropertyCard key={prop.id} property={prop} />))}
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
