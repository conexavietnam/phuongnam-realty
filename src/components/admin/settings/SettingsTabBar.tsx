import type { KeyboardEvent } from 'react';

export type SettingsTab = 'website' | 'form' | 'security';

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'website', label: 'Thông tin Website' },
  { id: 'form', label: 'Form' },
  { id: 'security', label: 'Bảo mật' },
];

interface SettingsTabBarProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsTabBar({ active, onChange }: SettingsTabBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    onChange(next.id);
    document.getElementById(`settings-tab-${next.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Cài đặt" className="inline-flex gap-1 p-1 rounded-xl bg-slate-200/70">
      {TABS.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="settings-tabpanel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              selected ? 'bg-navy-900 text-gold-400 shadow-sm' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
