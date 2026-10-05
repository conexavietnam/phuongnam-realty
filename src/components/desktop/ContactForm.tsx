import React, { useState } from 'react';
import { Send, User, Phone, Mail, ArrowRight, MessageSquare, MapPin, Building2, CircleDollarSign, CheckCircle2 } from 'lucide-react';
import type { ContactFormData } from '@/types';
import { companyService } from '@/services/companyService';
import { dataStorage } from '@/services/dataStorage';
import { telegramService } from '@/services/telegramService';
import { FormInput } from '@/components/common/FormInput';
import { FormSelect } from '@/components/common/FormSelect';
import { FormTextarea } from '@/components/common/FormTextarea';
import { Button } from '@/components/common/Button';

export interface ContactFormProps {
  onSubmit?: (data: ContactFormData) => void;
  className?: string;
}

const SUBJECT_OPTIONS = [
  { value: 'tu-van-mua-ban', label: 'Tư vấn mua bán BĐS' },
  { value: 'ky-gui-cho-thue', label: 'Ký gửi cho thuê BĐS' },
  { value: 'ho-tro-phap-ly', label: 'Hỗ trợ pháp lý & sang tên' },
  { value: 'hop-tac-dau-tu', label: 'Hợp tác đầu tư' },
  { value: 'khac', label: 'Khác' },
];

export function ContactForm({ onSubmit, className = '' }: ContactFormProps) {
  const filterConfig = companyService.getFilterConfig();

  const [formData, setFormData] = useState<ContactFormData>({
    fullName: '',
    phone: '',
    email: '',
    subject: '',
    region: '',
    propertyType: '',
    priceRange: '',
    message: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {};
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
      // 1. Save customer contact inquiry into storage
      dataStorage.addCustomerLead({
        fullName: formData.fullName,
        phone: formData.phone,
        purpose: 'tu-van',
        region: formData.region,
        propertyType: formData.propertyType,
        priceRange: formData.priceRange,
        note: `[Chủ đề: ${formData.subject || 'Tư vấn'}] [Email: ${formData.email || 'N/A'}] - ${formData.message}`,
        source: 'contact',
      });

      // 2. Dispatch real-time Telegram alert
      await telegramService.notifyNewContact({
        name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        subject: formData.subject ? SUBJECT_OPTIONS.find(s => s.value === formData.subject)?.label || formData.subject : 'Tư vấn dự án BĐS',
        message: formData.message,
      });

      if (onSubmit) {
        onSubmit(formData);
      }

      setSubmitted(true);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        subject: '',
        region: '',
        propertyType: '',
        priceRange: '',
        message: '',
      });
    } catch (err) {
      console.error('Error submitting contact form:', err);
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
        <h3 className="text-xl font-bold text-navy-900 mb-2">Đã gửi yêu cầu tư vấn thành công!</h3>
        <p className="text-slate-600 mb-6 text-sm max-w-md mx-auto">
          Cảm ơn quý khách đã gửi thông tin. Chuyên viên tư vấn của Phương Nam Realty đã nhận được thông báo qua Telegram và sẽ liên hệ lại với quý khách trong thời gian sớm nhất.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
          Gửi yêu cầu khác
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-slate-100 p-8 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-gold-500/10 text-gold-500 rounded-xl">
          <Send className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900">Gửi thông tin liên hệ</h2>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        Vui lòng điền đầy đủ thông tin bên dưới, chuyên viên tư vấn của Phương Nam Realty sẽ liên hệ lại ngay trong vòng 15 phút.
      </p>

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

        <FormInput
          label="Email"
          type="email"
          placeholder="email@example.com"
          icon={<Mail className="w-4 h-4" />}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormSelect
            label="Nội dung liên hệ"
            placeholder="Chọn nội dung liên hệ"
            icon={<MessageSquare className="w-4 h-4" />}
            options={SUBJECT_OPTIONS}
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
          <FormSelect
            label="Khu vực quan tâm"
            placeholder="Chọn khu vực"
            icon={<MapPin className="w-4 h-4" />}
            options={filterConfig.regions}
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormSelect
            label="Loại hình sản phẩm"
            placeholder="Chọn loại hình"
            icon={<Building2 className="w-4 h-4" />}
            options={filterConfig.propertyTypes}
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
          />
          <FormSelect
            label="Khoảng giá"
            placeholder="Chọn khoảng giá"
            icon={<CircleDollarSign className="w-4 h-4" />}
            options={filterConfig.priceRanges}
            value={formData.priceRange}
            onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
          />
        </div>

        <FormTextarea
          label="Nội dung chi tiết"
          placeholder="Nêu rõ yêu cầu, diện tích, vị trí mong muốn hoặc câu hỏi..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-md shadow-gold-500/20 group"
        >
          <span className="flex items-center justify-center gap-2">
            Gửi thông tin liên hệ
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Button>
      </form>
    </div>
  );
}
