import { Handshake } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { isPubliclyVisible } from '@/utils/consignment';
import type { ConsignmentListing, ConsignmentSection } from '@/types';

interface PromotedBannerProps {
  section: Exclude<ConsignmentSection, 'ky-gui'>;
  listings: ConsignmentListing[];
  onOpen: () => void;
}

// Shown on the Dự án / BĐS chuyển nhượng admin tabs: listings promoted from Ký gửi are
// displayed in this section on the website but are managed in the Ký gửi tab.
export function PromotedBanner({ section, listings, onOpen }: PromotedBannerProps) {
  const count = listings.filter((i) => i.section === section && isPubliclyVisible(i)).length;
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-5 py-3 text-xs">
      <span className="flex items-center gap-2">
        <Handshake className="w-4 h-4 shrink-0" />
        {count} tin từ Ký gửi đang hiển thị ở mục này — quản lý trong tab Ký gửi
      </span>
      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onOpen}>
        Mở tab Ký gửi
      </Button>
    </div>
  );
}
