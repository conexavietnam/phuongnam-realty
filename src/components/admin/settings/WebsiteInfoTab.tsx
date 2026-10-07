import React from 'react';
import { Button } from '@/components/common/Button';
import { ImageField } from '@/components/admin/ImageField';
import type { CompanyInfo } from '@/types/common';

interface WebsiteInfoTabProps {
  company: CompanyInfo;
  onChange: (company: CompanyInfo) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function WebsiteInfoTab({ company, onChange: setCompany, onSubmit: handleSaveCompany }: WebsiteInfoTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
      <h3 className="text-base font-bold text-navy-900 mb-1">
        Cập Nhật Thông Tin Doanh Nghiệp & Hình Ảnh Giao Diện
      </h3>
      <p className="text-xs text-slate-500 mb-6">
        Các thông tin dưới đây sẽ hiển thị trực tiếp tại Header, Footer, Hero Banner và trang Liên hệ. Bạn có thể chọn ảnh banner và logo từ kho VPS hoặc tải ảnh mới.
      </p>

      <form onSubmit={handleSaveCompany} className="space-y-6">
        {/* Visual Assets (Banner & Logo) */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
          <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider">
            Hình Ảnh Thương Hiệu & Banner
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageField
              label="Ảnh Nền Hero Banner Trang Chủ"
              value={company.heroBannerImage || '/images/hero-banner.svg'}
              onChange={(url) => setCompany({ ...company, heroBannerImage: url })}
              category="banner"
              aspectRatio="wide"
              helperText="Ảnh hiển thị toàn màn hình tại đầu trang chủ (Desktop & Mobile)."
            />

            <ImageField
              label="Logo Thương Hiệu Phương Nam Realty"
              value={company.logoImage || '/logo.svg'}
              onChange={(url) => setCompany({ ...company, logoImage: url })}
              category="logo"
              aspectRatio="square"
              helperText="Logo hiển thị trên Header, Footer, thanh điều hướng và màn hình đăng nhập."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên thương hiệu (*)</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Khẩu hiệu / Slogan</label>
            <input
              type="text"
              value={company.slogan}
              onChange={(e) => setCompany({ ...company, slogan: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hotline tư vấn (*)</label>
            <input
              type="text"
              value={company.hotline}
              onChange={(e) => setCompany({ ...company, hotline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email hỗ trợ</label>
            <input
              type="email"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ trụ sở chính</label>
            <input
              type="text"
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề Hero Banner</label>
            <input
              type="text"
              value={company.heroTitle}
              onChange={(e) => setCompany({ ...company, heroTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả phụ Hero Banner</label>
            <input
              type="text"
              value={company.heroSubtitle}
              onChange={(e) => setCompany({ ...company, heroSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Google Maps Embed URL</label>
            <input
              type="text"
              value={company.googleMapsEmbed}
              onChange={(e) => setCompany({ ...company, googleMapsEmbed: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
        </div>

        <div className="pt-3">
          <Button type="submit" variant="primary" size="sm" className="font-semibold text-xs py-2.5 px-6 shadow-sm">
            LƯU THAY ĐỔI THÔNG TIN CÔNG TY & HÌNH ẢNH
          </Button>
        </div>
      </form>
    </div>
  );
}

