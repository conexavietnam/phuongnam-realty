import { Link } from 'react-router-dom';
import { MapPin, Bed, Maximize, ArrowRight } from 'lucide-react';
import type { Project } from '@/types';
import { Badge } from '@/components/common/Badge';
import { SectionBadge } from '@/components/common/SectionBadge';

export interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/du-an/${project.slug}`}
      className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col h-full"
    >
      {/* Thumbnail with Badge Overlay */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-950">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <Badge variant="navy">
          {project.categoryLabel || project.category}
        </Badge>
        <SectionBadge kind="project" />
        {project.consignmentStatus === 'sold' && (
          <span className="absolute bottom-3 left-3 z-10 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow">
            Đã giao dịch
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-semibold text-lg text-navy-900 group-hover:text-gold-500 transition-colors line-clamp-1 mb-2">
            {project.name}
          </h3>

          <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-4">
            <MapPin className="w-4 h-4 text-gold-500 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 text-xs text-slate-600 py-3 border-y border-slate-100 mb-4">
            {project.bedrooms && (
              <div className="flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-navy-700" />
                <span>{project.bedrooms}</span>
              </div>
            )}
            {project.area && (
              <div className="flex items-center gap-1.5">
                <Maximize className="w-4 h-4 text-navy-700" />
                <span>{project.area}</span>
              </div>
            )}
          </div>
        </div>

        {/* Price & Link */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs text-slate-400 block">Giá từ</span>
            <span className="text-gold-500 font-bold text-lg leading-tight">
              {project.priceFrom}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-gold-500 group-hover:text-gold-600 transition-colors">
            Xem dự án
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
