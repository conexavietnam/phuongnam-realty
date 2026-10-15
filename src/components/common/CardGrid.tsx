import { Children } from 'react';
import type { ReactNode } from 'react';

interface CardGridProps {
  cols: 3 | 4;
  gap?: 'md' | 'lg';
  /** Skip the 2-column step: 1 column on mobile, `cols` from md (related-items blocks). */
  direct?: boolean;
  className?: string;
  children: ReactNode;
}

// Full static class strings so Tailwind's JIT can see them. Rows are centered,
// so a partial row never sticks to the left edge. md gap = 1.5rem, lg gap = 2rem.
const GAP_CLASS = { md: 'gap-6', lg: 'gap-8' } as const;

const ITEM_CLASS = {
  '3-md': 'w-full md:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]',
  '3-lg': 'w-full md:w-[calc(50%-1rem)] lg:w-[calc((100%-4rem)/3)]',
  '4-md': 'w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-4.5rem)/4)]',
  '4-lg': 'w-full sm:w-[calc(50%-1rem)] lg:w-[calc((100%-6rem)/4)]',
  '3-md-direct': 'w-full md:w-[calc((100%-3rem)/3)]',
  '3-lg-direct': 'w-full md:w-[calc((100%-4rem)/3)]',
} as const;

export function CardGrid({ cols, gap = 'md', direct = false, className = '', children }: CardGridProps) {
  const itemClass = `flex min-w-0 [&>*]:w-full [&>*]:min-w-0 ${ITEM_CLASS[`${cols}-${gap}${direct ? '-direct' : ''}` as keyof typeof ITEM_CLASS]}`;
  return (
    <div className={`flex flex-wrap justify-center ${GAP_CLASS[gap]} ${className}`.trim()}>
      {Children.toArray(children).map((child, i) => (
        <div key={(child as { key?: string }).key ?? i} className={itemClass}>
          {child}
        </div>
      ))}
    </div>
  );
}
