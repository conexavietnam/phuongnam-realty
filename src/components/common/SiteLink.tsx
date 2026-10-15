import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { NavLinkItem } from '@/utils/menuConfig';

interface SiteLinkProps {
  item: Pick<NavLinkItem, 'path' | 'kind' | 'newTab'>;
  active?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

// A menu link: a router link for site paths, a plain <a> for https://, mailto: and tel: (and for "open in a new tab").
// Items reaching this component were already validated by renderableNav()/renderableBottom().
export function SiteLink({ item, active = false, className, onClick, children }: SiteLinkProps) {
  const current = active ? ('page' as const) : undefined;
  if (item.kind === 'internal' && !item.newTab) {
    return (
      <Link to={item.path} className={className} onClick={onClick} aria-current={current}>
        {children}
      </Link>
    );
  }
  const external = item.kind === 'external' || item.newTab;
  return (
    <a
      href={item.path}
      className={className}
      onClick={onClick}
      aria-current={current}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}
