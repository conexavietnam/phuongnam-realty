
interface SectionTitleProps {
  subtitle?: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export function SectionTitle({
  subtitle,
  title,
  description,
  centered = false,
}: SectionTitleProps) {
  return (
    <div className={`mb-10 ${centered ? 'text-center flex flex-col items-center' : 'text-left'}`}>
      {subtitle && (
        <p className="text-gold-500 text-sm font-semibold uppercase tracking-wider mb-2">
          {subtitle}
        </p>
      )}
      
      <div className={`flex items-center gap-4 ${centered ? 'justify-center' : 'justify-start'} mb-4`}>
        {centered && <span className="h-px w-12 bg-gold-300"></span>}
        <h2 className="text-2xl lg:text-3xl font-bold text-navy-900">
          {title}
        </h2>
        {centered && <span className="h-px w-12 bg-gold-300"></span>}
      </div>

      {description && (
        <p className="text-slate-500 max-w-2xl text-base">
          {description}
        </p>
      )}
    </div>
  );
}
