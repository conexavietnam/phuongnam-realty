import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ImageField } from '@/components/admin/ImageField';
import { companyService } from '@/services/companyService';
import { SEO_DEFAULTS } from '@/utils/seo';
import {
  SEO_LIMITS,
  cleanCompanySeo,
  extractVerificationCode,
  normalizeCompanySeo,
  validateCompanySeo,
} from '@/utils/seoFields';
import type { CompanySeo } from '@/types/seo';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS, SUCCESS_CLASS } from '@/components/admin/settings/formStyles';

const CARD = 'bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6';
const CHECKBOX_CARD = 'flex items-start gap-3 cursor-pointer';

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className="w-full sm:w-28 shrink-0 text-xs font-semibold text-slate-600">{label}</span>
      <code className="basis-full sm:basis-0 flex-1 min-w-0 break-all rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-navy-900">{url}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Sao chép ${label}`}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-navy-900"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Đã chép' : 'Sao chép'}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Mở ${label}`}
        className="inline-flex items-center rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:text-navy-900"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </li>
  );
}

const GUIDE_STEPS: string[] = [
  'Mở search.google.com/search-console và đăng nhập bằng tài khoản Google của công ty. Chọn "Thêm tài sản" rồi chọn loại "Tiền tố URL", nhập đúng địa chỉ website (ví dụ https://phuongnamrealty.vn).',
  'Ở bước xác minh, chọn "Thẻ HTML": sao chép phần nằm trong content="..." (hoặc dán cả thẻ meta) vào ô "Mã xác minh Google" ở trên, bấm "LƯU CÀI ĐẶT SEO". Nếu muốn xác minh bằng "Tệp HTML", nhập tên file (dạng google1234abcd.html) vào ô "File xác minh HTML" và lưu.',
  'Quay lại Search Console, bấm "Xác minh". Chờ vài giây; nếu báo lỗi, kiểm tra lại đã lưu chưa và đã chọn đúng địa chỉ (có https, có hoặc không có www như đã nhập).',
  'Vào mục "Sơ đồ trang web" (Sitemaps), nhập sitemap.xml rồi bấm "Gửi". Địa chỉ đầy đủ nằm ở khung "Địa chỉ tự động tạo" ở trên.',
  'Vào "Kiểm tra URL", dán địa chỉ trang chủ và vài bài mới, bấm "Yêu cầu lập chỉ mục". Google thường mất từ vài ngày đến vài tuần để hiển thị.',
];

// Cài đặt > SEO: site-wide search settings and the Google Search Console hookup.
export function SeoSettingsTab() {
  const [draft, setDraft] = useState<CompanySeo>(() => normalizeCompanySeo(companyService.getCompanyInfo().seo));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const change = (patch: Partial<CompanySeo>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setBanner(null);
  };

  const changeFileName = (name: string) => {
    const typed = name.trim().toLowerCase();
    const current = draft.googleHtmlFile;
    const autoContent = (value: string) => (value ? `google-site-verification: ${value}` : '');
    const followsName = !current || current.content === '' || current.content === autoContent(current.name);
    change({ googleHtmlFile: { name: typed, content: followsName ? autoContent(typed) : current.content } });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanCompanySeo(draft);
    const problem = validateCompanySeo(cleaned);
    if (problem) {
      setBanner({ kind: 'error', text: problem });
      return;
    }
    setSaving(true);
    try {
      await companyService.saveSeo(cleaned);
      setDraft(cleaned);
      setBanner({ kind: 'success', text: 'Đã lưu cài đặt SEO thành công!' });
    } catch (err) {
      setDraft(normalizeCompanySeo(companyService.getCompanyInfo().seo));
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const descriptionLength = Array.from(draft.defaultDescription).length;
  const fileName = draft.googleHtmlFile?.name ?? '';

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className={CARD}>
        <h3 className="text-base font-bold text-navy-900 mb-1">Cài Đặt SEO Toàn Website</h3>
        <p className="text-xs text-slate-500 mb-4">
          Quyết định cách website xuất hiện trên Google, Zalo và Facebook. Từng bài viết có phần SEO riêng ngay trong trình soạn thảo.
        </p>
        <label className={CHECKBOX_CARD}>
          <input
            type="checkbox"
            checked={draft.indexSite}
            onChange={(e) => change({ indexSite: e.target.checked })}
            className="mt-0.5 w-4 h-4"
          />
          <span className="text-xs">
            <span className="block font-semibold text-slate-800">Cho phép Google lập chỉ mục website</span>
            <span className="block text-slate-500">
              Đang bật: website được Google thu thập, robots.txt cho phép và sitemap.xml liệt kê các trang đã đăng.
            </span>
          </span>
        </label>
        {!draft.indexSite && (
          <p role="alert" className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5">
            Đang TẮT: robots.txt sẽ chặn toàn bộ website (Disallow: /), sitemap.xml để trống và mọi trang gắn noindex. Chỉ tắt khi website chưa sẵn sàng công khai.
          </p>
        )}
      </div>

      {banner && (
        <div role={banner.kind === 'error' ? 'alert' : 'status'} className={banner.kind === 'error' ? ERROR_CLASS : SUCCESS_CLASS}>
          {banner.text}
        </div>
      )}

      <div className={`${CARD} space-y-5`}>
        <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider">Mặc định cho tiêu đề và chia sẻ</h4>
        <div>
          <label htmlFor="seoSuffix" className={LABEL_CLASS}>Hậu tố tiêu đề</label>
          <input
            id="seoSuffix"
            type="text"
            value={draft.titleSuffix}
            maxLength={SEO_LIMITS.suffixMax}
            onChange={(e) => change({ titleSuffix: e.target.value })}
            placeholder={SEO_DEFAULTS.titleSuffix}
            className={`${INPUT_CLASS} font-mono`}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Gắn vào cuối tiêu đề trang khi bài không có tiêu đề SEO riêng. Ví dụ: "Căn hộ Palm River{draft.titleSuffix}". Để trống nếu không muốn hậu tố.
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <label htmlFor="seoDefaultDescription" className="text-xs font-semibold text-slate-700">Mô tả mặc định của website</label>
            <span className="text-[11px] font-semibold text-slate-500">{descriptionLength}/{SEO_LIMITS.descriptionMax} ký tự</span>
          </div>
          <textarea
            id="seoDefaultDescription"
            rows={3}
            value={draft.defaultDescription}
            maxLength={SEO_LIMITS.descriptionMax}
            onChange={(e) => change({ defaultDescription: e.target.value })}
            placeholder={SEO_DEFAULTS.description}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-[11px] text-slate-500">Dùng cho trang chủ và cho bài chưa có mô tả. Nên viết 120 đến 160 ký tự.</p>
        </div>

        <ImageField
          label="Ảnh chia sẻ mặc định (OG image)"
          value={draft.defaultOgImage || SEO_DEFAULTS.ogImage}
          onChange={(url) => change({ defaultOgImage: url })}
          category="banner"
          aspectRatio="wide"
          helperText="Hiển thị khi chia sẻ link lên Zalo, Facebook mà bài không có ảnh riêng. Dùng JPG hoặc PNG tỉ lệ 1200×630 (không dùng SVG)."
        />
      </div>

      <div className={`${CARD} space-y-5`}>
        <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider">Xác minh quyền sở hữu</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="seoGoogleCode" className={LABEL_CLASS}>Mã xác minh Google (thẻ meta)</label>
            <input
              id="seoGoogleCode"
              type="text"
              value={draft.googleSiteVerification}
              onChange={(e) => change({ googleSiteVerification: extractVerificationCode(e.target.value) })}
              placeholder="Dán mã hoặc cả thẻ meta Google đưa"
              className={`${INPUT_CLASS} font-mono`}
            />
            <p className="mt-1 text-[11px] text-slate-500">Chỉ cần phần trong content="...". Dán cả thẻ meta, hệ thống tự tách mã.</p>
          </div>
          <div>
            <label htmlFor="seoBingCode" className={LABEL_CLASS}>Mã xác minh Bing (không bắt buộc)</label>
            <input
              id="seoBingCode"
              type="text"
              value={draft.bingSiteVerification}
              onChange={(e) => change({ bingSiteVerification: extractVerificationCode(e.target.value) })}
              placeholder="Mã msvalidate.01 của Bing Webmaster"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="seoHtmlFile" className={LABEL_CLASS}>File xác minh HTML (không bắt buộc)</label>
            <input
              id="seoHtmlFile"
              type="text"
              value={fileName}
              onChange={(e) => changeFileName(e.target.value)}
              placeholder="google1234abcd5678.html"
              className={`${INPUT_CLASS} font-mono`}
            />
            {fileName && <p className="mt-1 text-[11px] text-slate-500 break-all">Địa chỉ file: {origin}/{fileName}</p>}
          </div>
          <div>
            <label htmlFor="seoHtmlContent" className={LABEL_CLASS}>Nội dung file xác minh</label>
            <input
              id="seoHtmlContent"
              type="text"
              value={draft.googleHtmlFile?.content ?? ''}
              disabled={!fileName}
              onChange={(e) => change({ googleHtmlFile: { name: fileName, content: e.target.value } })}
              placeholder="google-site-verification: google1234abcd5678.html"
              className={`${INPUT_CLASS} font-mono disabled:bg-slate-100`}
            />
            <p className="mt-1 text-[11px] text-slate-500">Tự điền khi nhập tên file; thường không cần sửa.</p>
          </div>
        </div>
        {fileName && (
          <Button type="button" variant="outline" size="sm" onClick={() => change({ googleHtmlFile: null })} className="text-xs py-1.5 px-3">
            Xóa file xác minh
          </Button>
        )}
      </div>

      <div className={CARD}>
        <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider mb-3">Địa chỉ tự động tạo</h4>
        <ul className="space-y-2.5">
          <CopyableUrl label="Sơ đồ trang web" url={`${origin}/sitemap.xml`} />
          <CopyableUrl label="Robots" url={`${origin}/robots.txt`} />
          {fileName && <CopyableUrl label="File xác minh" url={`${origin}/${fileName}`} />}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">
          Hai địa chỉ đầu do máy chủ tạo từ dữ liệu hiện có, luôn cập nhật khi bạn đăng hoặc ẩn bài. Không cần chỉnh tay.
        </p>
      </div>

      <details className={CARD}>
        <summary className="cursor-pointer font-bold text-xs text-navy-900 uppercase tracking-wider">
          Hướng dẫn kết nối Google Search Console
        </summary>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-xs text-slate-700">
          {GUIDE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-slate-500">
          Nếu đã xác minh bằng bản ghi DNS (loại "Tên miền") thì không cần điền mã ở đây; chỉ cần gửi sitemap.xml.
        </p>
      </details>

      <div>
        <Button type="submit" variant="primary" size="sm" disabled={saving} className="font-semibold text-xs py-2.5 px-6 shadow-sm">
          {saving ? 'ĐANG LƯU...' : 'LƯU CÀI ĐẶT SEO'}
        </Button>
      </div>
    </form>
  );
}
