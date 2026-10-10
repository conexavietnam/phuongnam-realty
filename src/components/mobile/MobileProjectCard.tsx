import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Maximize } from 'lucide-react';
import type { Project } from '@/types';
import { SectionBadge } from '@/components/common/SectionBadge';
import { typeLabel } from '@/utils/typeLabel';

interface MobileProjectCardProps {
  project: Project;
}

export const MobileProjectCard: React.FC<MobileProjectCardProps> = ({ project }) => {
  return (
    <Link 
      to={`/du-an/${project.slug}`}
      className="flex bg-white rounded-xl shadow-sm overflow-hidden p-3 mb-3 border border-slate-100 active:scale-[0.98] transition-transform"
    >
      <div className="relative shrink-0 w-32 h-28 bg-navy-950 rounded-lg overflow-hidden">
        <img 
          src={project.thumbnail} 
          alt={project.name} 
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 bg-navy-900/80 text-white text-[10px] font-medium px-2 py-1 rounded">
          {project.categoryLabel || typeLabel(project.category)}
        </div>
        <SectionBadge kind="project" className="absolute bottom-2 left-2" />
        {project.consignmentStatus === 'sold' && (
          <span className="absolute bottom-2 right-2 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            Đã giao dịch
          </span>
        )}
      </div>
      
      <div className="ml-3 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className="font-semibold text-navy-900 text-sm leading-tight line-clamp-2 mb-1">
            {project.name}
          </h3>
          <div className="flex items-center text-slate-500 text-xs mb-1.5">
            <MapPin className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center space-x-3 text-slate-600 text-xs mb-1.5">
            <div className="flex items-center">
              <Bed className="w-3.5 h-3.5 mr-1" />
              {project.bedrooms}
            </div>
            <div className="flex items-center">
              <Maximize className="w-3.5 h-3.5 mr-1" />
              {project.area}
            </div>
          </div>
          <div className="text-gold-500 font-bold text-sm">
            {project.priceFrom}
          </div>
        </div>
      </div>
    </Link>
  );
};
