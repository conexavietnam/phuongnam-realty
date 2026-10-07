import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';

// TipTap is admin-only: keep it out of the public bundle.
const RichTextEditor = lazy(() => import('./RichTextEditor'));

export function LazyRichTextEditor(props: ComponentProps<typeof RichTextEditor>) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[320px] rounded-xl border border-slate-300 bg-slate-50 animate-pulse flex items-center justify-center text-xs text-slate-400">
          Đang tải trình soạn thảo...
        </div>
      }
    >
      <RichTextEditor {...props} />
    </Suspense>
  );
}
