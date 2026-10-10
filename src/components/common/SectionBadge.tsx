export type SectionKind = 'project' | 'transfer' | 'consignment';

const SECTIONS: Record<SectionKind, { label: string; className: string }> = {
  project: { label: 'Dự án', className: 'bg-navy-700 text-white' },
  transfer: { label: 'Chuyển nhượng', className: 'bg-sky-600 text-white' },
  consignment: { label: 'Ký gửi', className: 'bg-gold-500 text-white' },
};

interface SectionBadgeProps {
  kind: SectionKind;
  className?: string;
}

// Tells the three real-estate sections apart on every card. The parent must be `relative`.
export function SectionBadge({ kind, className = 'absolute top-3 right-3' }: SectionBadgeProps) {
  const { label, className: colors } = SECTIONS[kind];
  return (
    <span
      className={`${className} z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${colors}`}
    >
      {label}
    </span>
  );
}
