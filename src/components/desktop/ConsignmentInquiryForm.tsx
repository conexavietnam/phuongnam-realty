import React, { useState } from 'react';
import { User, Phone, Send, CheckCircle2 } from 'lucide-react';
import { telegramService } from '@/services/telegramService';
import { FormInput } from '@/components/common/FormInput';
import { FormTextarea } from '@/components/common/FormTextarea';
import { Button } from '@/components/common/Button';
import type { ConsignmentListing } from '@/types';

interface ConsignmentInquiryFormProps {
  listing: ConsignmentListing;
}

interface FieldErrors {
  fullName?: string;
  phone?: string;
}

// "Liên hệ về tin này": goes through the normal contact lead flow, with the listing named in the note.
export function ConsignmentInquiryForm({ listing }: ConsignmentInquiryFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên';
    if (!phone.trim()) {
      next.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(\+84|0)[0-9\s.-]{8,13}$/.test(phone.trim())) {
      next.phone = 'Số điện thoại không hợp lệ';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await telegramService.submitContact({
        fullName,
        phone,
        subject: `Quan tâm tin ký gửi: ${listing.title}`,
        message: `Tin ký gửi "${listing.title}" (/ky-gui/${listing.slug}). ${message}`.trim(),
        region: listing.region,
        propertyType: listing.propertyType,
        honeypot,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h3 className="font-bold text-navy-900 mb-1">Đã gửi yêu cầu</h3>
        <p className="text-sm text-slate-600">
          Chuyên viên Phương Nam Realty sẽ liên hệ với bạn về tin này trong thời gian sớm nhất.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-navy-900 text-lg mb-1">Liên hệ về tin này</h3>
      <p className="text-xs text-slate-500 mb-4">Để lại số điện thoại, chuyên viên sẽ gọi lại tư vấn chi tiết.</p>
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <FormInput
        label="Họ và tên *"
        icon={<User className="w-4 h-4" />}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
      />
      <FormInput
        label="Số điện thoại *"
        icon={<Phone className="w-4 h-4" />}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
      />
      <FormTextarea
        label="Nội dung (không bắt buộc)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {submitError && <p className="text-red-500 text-xs mb-3" role="alert">{submitError}</p>}
      <Button type="submit" variant="primary" size="md" className="w-full font-bold" disabled={isSubmitting}>
        <span className="flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          GỬI YÊU CẦU
        </span>
      </Button>
    </form>
  );
}
