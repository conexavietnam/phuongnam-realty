import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="bg-navy-900 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center text-sm text-slate-300">
          <Link to="/" className="hover:text-gold-500 transition-colors flex items-center">
            <Home className="w-4 h-4" />
          </Link>
          
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4 mx-2 text-slate-500" />
              {item.path ? (
                <Link to={item.path} className="hover:text-gold-500 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gold-500 font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </div>
  );
}
