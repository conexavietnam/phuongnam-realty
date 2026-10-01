import { MapPin } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { CompanyInfo } from '@/components/desktop/CompanyInfo';
import { ContactForm } from '@/components/desktop/ContactForm';
import { SectionTitle } from '@/components/common/SectionTitle';
import { companyService } from '@/services/companyService';

export function ContactPage() {
  const company = companyService.getCompanyInfo();

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[200px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'Liên hệ' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            LIÊN HỆ VỚI CHÚNG TÔI
          </h1>
          <p className="text-slate-300 text-base max-w-3xl">
            Phương Nam Realty luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của quý khách hàng về mua bán, cho thuê và ký gửi bất động sản.
          </p>
        </div>
      </section>

      {/* Main Two-Column Contact Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: CompanyInfo (Navy Card) */}
            <div className="lg:col-span-5 h-full">
              <CompanyInfo />
            </div>

            {/* Right Column: ContactForm */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="TÌM ĐƯỜNG ĐẾN VĂN PHÒNG"
            title="BẢN ĐỒ VỊ TRÍ"
            description="Văn phòng Phương Nam Realty tọa lạc tại vị trí thuận tiện giao thông, sẵn sàng đón tiếp quý khách."
          />

          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative bg-slate-100">
            {/* Map title bar */}
            <div className="bg-navy-900 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="w-4 h-4 text-gold-500" />
                <span>Trụ sở chính: {company.address}</span>
              </div>
              <a
                href={company.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold-400 hover:text-gold-300 font-medium transition-colors"
              >
                Mở trong Google Maps →
              </a>
            </div>

            <iframe
              src={company.googleMapsEmbed}
              title="Bản đồ vị trí Phương Nam Realty"
              className="w-full h-[400px] border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
