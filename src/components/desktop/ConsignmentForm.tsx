import React, { useState } from 'react';
import { Send, User, Phone, MapPin, Building2, CircleDollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ConsignmentFormData } from '@/types';
import { companyService } from '@/services/companyService';
import { dataStorage } from '@/services/dataStorage';
import { telegramService } from '@/services/telegramService';
import { FormInput } from '@/components/common/FormInput';
import { FormSelect } from '@/components/common/FormSelect';
import { FormTextarea } from '@/components/common/FormTextarea';
import { Button } from '@/components/common/Button';

export interface ConsignmentFormProps {
  onSubmit?: (data: ConsignmentFormData) => void;
  className?: string;
}

export function ConsignmentForm({ onSubmit, className = '' }: ConsignmentFormProps) {
  const filterConfig = companyService.getFilterConfig();

  const [formData, setFormData] = useState<ConsignmentFormData>({
    fullName: '',
    phone: '',
    purpose: 'ban',
    region: '',
    propertyType: '',
    priceRange: '',
    note: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ConsignmentFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ConsignmentFormData, string>> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9+\s-]{9,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Save lead to local storage engine
      dataStorage.addCustomerLead({
        fullName: formData.fullName,
        phone: formData.phone,
        purpose: formData.purpose,
        region: formData.region,
        propertyType: formData.propertyType,
        priceRange: formData.priceRange,
        note: formData.note,
        source: 'consignment',
      });

      // 2. Dispatch real-time Telegram alert to Admin
      await telegramService.notifyNewConsignment({
        fullName: formData.fullName,
        phone: formData.phone,
        propertyType: formData.propertyType || (formData.purpose === 'ban' ? 'Cần bán BĐS' : 'Cho thuê BĐS'),
        address: formData.region,
        expectedPrice: formData.priceRange,
        note: formData.note,
      });

      if (onSubmit) {
        onSubmit(formData);
      }

      setSubmitted(true);
      setFormData({
        fullName: '',
        phone: '',
        purpose: 'ban',
        region: '',
        propertyType: '',
        priceRange: '',
        note: '',
      });
    } catch (err) {
      console.error('Error submitting consignment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h3 className="text-2xl font-bold text-navy-900 mb-2">Gửi Ký Gửi Thành Công!</h3>
        <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
          Cảm ơn quý khách. Yêu cầu ký gửi đã được chuyển ngay lập tức tới bộ phận thẩm định của Phương Nam Realty qua hệ thống quản trị. Chuyên viên sẽ gọi điện tư vấn trong vòng 15 phút.
        </p>
        <Button variant="primary" size="md" onClick={() => setSubmitted(false)}>
          Gửi thêm yêu cầu khác
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-slate-100 p-6 lg:p-8 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 bg-gold-500/10 text-gold-500 rounded-xl">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-navy-900">Ký Gửi Bất Động Sản</h3>
          <p className="text-xs text-slate-500">Bảo mật thông tin & thanh khoản nhanh chóng</p>
        </div>
      </div>

      {/* Purpose Tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, purpose: 'ban' })}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
            formData.purpose === 'ban'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          Cần Bán
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, purpose: 'cho-thue' })}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
            formData.purpose === 'cho-thue'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          Cho Thuê
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormInput
            label="Họ và tên *"
            placeholder="Nguyễn Văn A"
            icon={<User className="w-4 h-4" />}
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            error={errors.fullName}
          />
          <FormInput
            label="Số điện thoại *"
            placeholder="0901 234 567"
            icon={<Phone className="w-4 h-4" />}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
          <FormSelect
            label="Khu vực"
            placeholder="Chọn khu vực"
            icon={<MapPin className="w-4 h-4" />}
            options={filterConfig.regions}
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />
          <FormSelect
            label="Loại BĐS"
            placeholder="Chọn loại hình"
            icon={<Building2 className="w-4 h-4" />}
            options={filterConfig.propertyTypes}
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
          />
          <FormSelect
            label="Khoảng giá dự kiến"
            placeholder="Chọn khoảng giá"
            icon={<CircleDollarSign className="w-4 h-4" />}
            options={filterConfig.priceRanges}
            value={formData.priceRange}
            onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
          />
        </div>

        <FormTextarea
          label="Thông tin chi tiết BĐS"
          placeholder="Ví dụ: Tòa Landmark 3, căn góc tầng 18, diện tích 85m2, sổ hồng chính chủ..."
          value={formData.note || ''}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-md shadow-gold-500/20 group"
        >
          <span className="flex items-center justify-center gap-2">
            GỬI THÔNG TIN KÝ GỬI
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Button>
      </form>
    </div>
  );
}
