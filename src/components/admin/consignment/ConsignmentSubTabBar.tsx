import type { KeyboardEvent } from 'react';

export type ConsignmentSubTab = 'applications' | 'listings';

interface ConsignmentSubTabBarProps {
  active: ConsignmentSubTab;
  onChange: (tab: ConsignmentSubTab) => void;
  pendingApplications: number;
  listingCount: number;
}

export function ConsignmentSubTabBar({ active, onChange, pendingApplications, listingCount }: ConsignmentSubTabBarProps) {
  const tabs: Array<{ id: ConsignmentSubTab; label: string; count: number; alert: boolean }> = [
    { id: 'applications', label: 'Đơn chờ xử lý', count: pendingApplications, alert: pendingApplications > 0 },
    { id: 'listings', label: 'Tin ký gửi', count: listingCount, alert: false },
  ];

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`consignment-tab-${next.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Ký gửi" className="inline-flex gap-1 p-1 rounded-xl bg-slate-200/70">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`consignment-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="consignment-tabpanel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-2 ${
              selected ? 'bg-navy-900 text-gold-400 shadow-sm' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            {tab.label}
            <span
              className={`min-w-5 px-1.5 rounded-full text-[10px] leading-5 text-center ${
                tab.alert ? 'bg-rose-500 text-white' : selected ? 'bg-white/15' : 'bg-white text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
