import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ConsignmentListing, CustomerLead } from '@/types';

interface LeadsExportButtonProps {
  filtered: CustomerLead[];
  all: CustomerLead[];
  listings: ConsignmentListing[];
  onNotify: (message: string) => void;
  onError: (message: string) => void;
}

export function LeadsExportButton({ filtered, all, listings, onNotify, onError }: LeadsExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const run = async (leads: CustomerLead[]) => {
    setOpen(false);
    if (leads.length === 0 || busy) return;
    setBusy(true);
    try {
      // The xlsx writer is only downloaded when someone actually exports.
      const { exportLeadsToExcel } = await import('@/services/leadsExport');
      const name = await exportLeadsToExcel(leads, listings);
      onNotify(`Đã xuất ${leads.length} dòng ra file ${name}`);
    } catch (err) {
      onError(err instanceof Error ? `Xuất Excel thất bại: ${err.message}` : 'Xuất Excel thất bại. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const item = 'w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy || all.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 text-gold-400 px-3 py-2 text-xs font-semibold hover:bg-navy-800 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        Xuất Excel
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 sm:left-auto sm:right-0 z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          <button type="button" role="menuitem" disabled={filtered.length === 0} onClick={() => run(filtered)} className={item}>
            <span className="font-semibold text-navy-900">Theo bộ lọc hiện tại</span>
            <span className="block text-slate-500">Xuất {filtered.length} dòng</span>
          </button>
          <button type="button" role="menuitem" disabled={all.length === 0} onClick={() => run(all)} className={item}>
            <span className="font-semibold text-navy-900">Tất cả</span>
            <span className="block text-slate-500">Xuất {all.length} dòng</span>
          </button>
        </div>
      )}
    </div>
  );
}
