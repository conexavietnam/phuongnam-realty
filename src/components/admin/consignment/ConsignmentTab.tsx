import { useEffect, useState } from 'react';
import { ConsignmentSubTabBar } from '@/components/admin/consignment/ConsignmentSubTabBar';
import type { ConsignmentSubTab } from '@/components/admin/consignment/ConsignmentSubTabBar';
import { ApplicationsPanel } from '@/components/admin/consignment/ApplicationsPanel';
import { ListingsPanel } from '@/components/admin/consignment/ListingsPanel';
import { ListingEditorModal } from '@/components/admin/consignment/ListingEditorModal';
import type { AdminActions } from '@/components/admin/consignment/types';
import { consignmentService } from '@/services/consignmentService';
import { applicationStage } from '@/utils/consignment';
import type { ConsignmentListing, CustomerLead } from '@/types';

interface ConsignmentTabProps {
  leads: CustomerLead[];
  listings: ConsignmentListing[];
  actions: AdminActions;
  // Set by other tabs (e.g. the Leads table) to jump straight into a listing's editor.
  requestedListingId: string | null;
  onRequestHandled: () => void;
}

interface EditorState {
  listing: ConsignmentListing;
  isNew: boolean;
}

export function ConsignmentTab({ leads, listings, actions, requestedListingId, onRequestHandled }: ConsignmentTabProps) {
  // The tab only mounts while it is active, so a request from another tab can seed the initial state.
  const [subTab, setSubTab] = useState<ConsignmentSubTab>(requestedListingId ? 'listings' : 'applications');
  const [editor, setEditor] = useState<EditorState | null>(() => {
    const target = listings.find((i) => i.id === requestedListingId);
    return target ? { listing: target, isNew: false } : null;
  });

  useEffect(() => {
    if (requestedListingId) onRequestHandled();
  }, [requestedListingId, onRequestHandled]);

  const applications = leads.filter((l) => l.source === 'consignment');
  const pending = applications.filter((l) => {
    const stage = applicationStage(l);
    return stage === 'new' || stage === 'processing';
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <h2 className="text-xl font-bold text-navy-900">Quản Lý Ký Gửi</h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Đơn khách gửi từ form Ký gửi &rarr; xem xét &rarr; Duyệt tạo tin nháp &rarr; soạn bài, thêm ảnh &rarr; Đăng lên trang Ký gửi.
        </p>
        <ConsignmentSubTabBar
          active={subTab}
          onChange={setSubTab}
          pendingApplications={pending}
          listingCount={listings.length}
        />
      </div>

      <div role="tabpanel" id="consignment-tabpanel" aria-labelledby={`consignment-tab-${subTab}`}>
        {subTab === 'applications' && (
          <ApplicationsPanel
            leads={leads}
            listings={listings}
            actions={actions}
            onOpenListing={(listing) => {
              setSubTab('listings');
              setEditor({ listing, isNew: false });
            }}
          />
        )}
        {subTab === 'listings' && (
          <ListingsPanel
            listings={listings}
            actions={actions}
            onEdit={(listing) => setEditor({ listing, isNew: false })}
            onCreate={() => setEditor({ listing: consignmentService.createBlank(), isNew: true })}
          />
        )}
      </div>

      {editor && (
        <ListingEditorModal
          key={editor.listing.id}
          initial={editor.listing}
          isNew={editor.isNew}
          actions={actions}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
