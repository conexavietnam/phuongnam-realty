import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { SiteLink } from '@/components/common/SiteLink';
import { companyService } from '@/services/companyService';
import { useDataListener } from '@/hooks';
import { isLinkActive, isNavItemActive } from '@/utils/menuConfig';
import type { NavItem } from '@/utils/menuConfig';

const TOP_LINK = 'text-base transition-colors py-2';
const TOP_ACTIVE = 'text-gold-500 font-semibold border-b-2 border-gold-500';
const TOP_IDLE = 'text-navy-800 hover:text-gold-500';
const CLOSE_DELAY_MS = 150;

interface OpenState {
  id: string;
  // The menu belongs to the page it was opened on, so changing route closes it without an effect.
  pathname: string;
}

// Header menu. An item with a submenu is a link plus a chevron button (aria-expanded) that opens a dropdown:
// on hover (mouse), on click/tap, and with the keyboard (Enter/Space on the button, ArrowDown to enter the list,
// ArrowUp/ArrowDown/Home/End inside it, Escape to close and return to the button).
export function DesktopNav() {
  useDataListener();
  const { pathname } = useLocation();
  const items = companyService.getNavigation().desktop;
  const [opened, setOpened] = useState<OpenState | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const isOpen = (id: string) => opened?.id === id && opened.pathname === pathname;
  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const open = (id: string) => {
    cancelClose();
    setOpened({ id, pathname });
  };
  const close = () => {
    cancelClose();
    setOpened(null);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpened(null), CLOSE_DELAY_MS);
  };

  const links = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-submenu] a'));

  const handleKeyDown = (e: KeyboardEvent<HTMLLIElement>, item: NavItem) => {
    const root = e.currentTarget;
    const button = root.querySelector<HTMLButtonElement>('[data-submenu-toggle]');
    if (e.key === 'Escape' && isOpen(item.id)) {
      e.preventDefault();
      close();
      button?.focus();
      return;
    }
    if (e.key === 'ArrowDown' && e.target === button) {
      e.preventDefault();
      open(item.id);
      // The list is rendered after the state change.
      window.setTimeout(() => links(root)[0]?.focus(), 0);
      return;
    }
    const inList = (e.target as HTMLElement).closest('[data-submenu]') !== null;
    if (!inList) return;
    const list = links(root);
    const index = list.indexOf(e.target as HTMLAnchorElement);
    const move = (to: number) => {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(list.length - 1);
  };

  return (
    <nav aria-label="Menu chính" className="hidden md:block">
      <ul className="flex items-center gap-8">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          if (item.children.length === 0) {
            return (
              <li key={item.id}>
                <SiteLink item={item} active={isLinkActive(pathname, item)} className={`${TOP_LINK} ${active ? TOP_ACTIVE : TOP_IDLE}`}>
                  {item.label}
                </SiteLink>
              </li>
            );
          }
          const expanded = isOpen(item.id);
          const menuId = `submenu-${item.id}`;
          return (
            <li
              key={item.id}
              className="relative"
              onPointerEnter={(e) => e.pointerType === 'mouse' && open(item.id)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
              }}
              onKeyDown={(e) => handleKeyDown(e, item)}
            >
              <div className="flex items-center">
                <SiteLink
                  item={item}
                  active={isLinkActive(pathname, item)}
                  onClick={close}
                  className={`${TOP_LINK} ${active ? TOP_ACTIVE : TOP_IDLE}`}
                >
                  {item.label}
                </SiteLink>
                <button
                  type="button"
                  data-submenu-toggle
                  aria-expanded={expanded}
                  aria-controls={expanded ? menuId : undefined}
                  aria-label={`Menu con của ${item.label}`}
                  onClick={() => (expanded ? close() : open(item.id))}
                  className={`ml-0.5 p-1 rounded transition-colors ${active ? 'text-gold-500' : 'text-navy-800 hover:text-gold-500'}`}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {expanded && (
                <div className="absolute left-0 top-full z-50 pt-2">
                  <ul id={menuId} data-submenu className="min-w-[14rem] max-w-xs bg-white rounded-xl shadow-xl border border-slate-100 py-2">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <SiteLink
                          item={child}
                          active={isLinkActive(pathname, child)}
                          onClick={close}
                          className={`block px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 hover:text-gold-500 ${
                            isLinkActive(pathname, child) ? 'text-gold-500 font-semibold bg-gold-50/40' : 'text-navy-800'
                          }`}
                        >
                          {child.label}
                        </SiteLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
