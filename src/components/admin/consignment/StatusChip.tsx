import { CONSIGNMENT_STATUS_LABELS, STAGE_LABELS } from '@/utils/consignment';
import type { ApplicationStage } from '@/utils/consignment';
import type { ConsignmentStatus } from '@/types';

const STAGE_TONES: Record<ApplicationStage, string> = {
  new: 'bg-rose-100 text-rose-700',
  processing: 'bg-blue-100 text-blue-700',
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
  rejected: 'bg-slate-100 text-slate-500 line-through',
};

const LISTING_TONES: Record<ConsignmentStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-slate-200 text-slate-700',
};

const CHIP = 'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap';

export function StageChip({ stage }: { stage: ApplicationStage }) {
  return <span className={`${CHIP} ${STAGE_TONES[stage]}`}>{STAGE_LABELS[stage]}</span>;
}

export function ListingStatusChip({ status }: { status: ConsignmentStatus }) {
  return <span className={`${CHIP} ${LISTING_TONES[status]}`}>{CONSIGNMENT_STATUS_LABELS[status]}</span>;
}
