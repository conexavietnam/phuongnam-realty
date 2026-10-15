// Menu rules shared by the editor (Cài đặt > Menu) and the public header, drawer and bottom bar.
// PHP twin: pn_valid_menu() in server/src/storage.php. Pure functions, no imports at run time.
import type { MenuChild, MenuItem } from '../types/common.ts';

export const MENU_LIMITS = { items: 10, children: 12, bottom: 5, label: 40, url: 500 } as const;

// Lucide icons the bottom bar can show (components: src/components/common/menuIcons.ts).
// PHP twin: PN_MENU_ICONS in server/src/storage.php.
export const MENU_ICON_NAMES = [
  'Home', 'Building2', 'Send', 'Newspaper', 'Phone', 'Mail', 'MapPin', 'Search', 'Heart', 'User', 'Info', 'Handshake', 'Key', 'Landmark',
] as const;

export type MenuIconName = (typeof MENU_ICON_NAMES)[number];

export const MENU_ICON_LABELS: Record<MenuIconName, string> = {
  Home: 'Nhà', Building2: 'Tòa nhà', Send: 'Gửi', Newspaper: 'Tin tức', Phone: 'Điện thoại', Mail: 'Thư', MapPin: 'Vị trí',
  Search: 'Tìm kiếm', Heart: 'Yêu thích', User: 'Người dùng', Info: 'Thông tin', Handshake: 'Bắt tay', Key: 'Chìa khóa', Landmark: 'Công trình',
};

export type MenuLinkKind = 'internal' | 'external' | 'mail' | 'tel';

// Only these shapes are ever rendered as links; javascript:, data:, //host, http:// and backslashes are rejected.
export function classifyMenuUrl(raw: string): MenuLinkKind | null {
  const url = raw.trim();
  if (!url || url.length > MENU_LIMITS.url || /[\s"'<>\\]/.test(url)) return null;
  if (/^\/(?!\/)/.test(url)) return 'internal';
  if (/^https:\/\/[^/?#]+/i.test(url)) return 'external';
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return 'mail';
  if (/^tel:\+?[0-9][0-9.\-()]*$/i.test(url)) return 'tel';
  return null;
}

export const URL_HELP = 'Chỉ nhận đường dẫn nội bộ bắt đầu bằng "/", hoặc https://, mailto:, tel:.';

export const isMenuIcon = (value: unknown): value is MenuIconName => (MENU_ICON_NAMES as readonly unknown[]).includes(value);

// A link ready to render. `kind` decides between a router link and a plain <a>.
export interface NavLinkItem {
  id: string;
  label: string;
  path: string;
  kind: MenuLinkKind;
  newTab: boolean;
  exact: boolean;
}

export interface NavItem extends NavLinkItem {
  children: NavLinkItem[];
}

export interface BottomItem extends NavLinkItem {
  icon: MenuIconName;
}

function toLink(entry: MenuChild & { exact?: boolean }, fallbackId: string): NavLinkItem | null {
  if (entry.visible === false || typeof entry.label !== 'string' || typeof entry.path !== 'string') return null;
  const label = entry.label.trim();
  const path = entry.path.trim();
  const kind = classifyMenuUrl(path);
  if (!label || !kind) return null;
  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : fallbackId,
    label,
    path,
    kind,
    newTab: entry.newTab === true || kind === 'external',
    exact: entry.exact === true,
  };
}

// What the header and drawer show: hidden or invalid entries are skipped, submenus are one level deep.
// A missing/legacy shape (plain {label, path}) works unchanged.
export function renderableNav(items: readonly MenuItem[] | undefined): NavItem[] {
  const out: NavItem[] = [];
  (items ?? []).slice(0, MENU_LIMITS.items).forEach((entry, index) => {
    const link = toLink(entry, `item-${index}`);
    if (!link) return;
    const children: NavLinkItem[] = [];
    (Array.isArray(entry.children) ? entry.children : []).slice(0, MENU_LIMITS.children).forEach((child, i) => {
      const sub = toLink(child, `${link.id}-${i}`);
      if (sub) children.push(sub);
    });
    out.push({ ...link, children });
  });
  return out;
}

export function renderableBottom(items: readonly MenuItem[] | undefined): BottomItem[] {
  const out: BottomItem[] = [];
  (items ?? []).slice(0, MENU_LIMITS.bottom).forEach((entry, index) => {
    const link = toLink(entry, `bottom-${index}`);
    if (link) out.push({ ...link, icon: isMenuIcon(entry.icon) ? entry.icon : 'Home' });
  });
  return out;
}

const stripPath = (path: string): string => {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
};

// Whether `pathname` is the page a site link points at (exact for "/" and for items marked exact).
export function isLinkActive(pathname: string, link: Pick<NavLinkItem, 'path' | 'kind' | 'exact'>): boolean {
  if (link.kind !== 'internal') return false;
  const target = stripPath(link.path);
  const here = stripPath(pathname);
  if (target === '/' || link.exact) return here === target;
  return here === target || here.startsWith(`${target}/`);
}

// A parent is active when it or any of its submenu items is.
export const isNavItemActive = (pathname: string, item: NavItem): boolean =>
  isLinkActive(pathname, item) || item.children.some((child) => isLinkActive(pathname, child));

// ---------------------------------------------------------------------------------------------
// Editor validation (Vietnamese messages)
// ---------------------------------------------------------------------------------------------

export interface DraftLinkLike {
  label: string;
  path: string;
}

export function linkProblem(entry: DraftLinkLike, where: string): string | null {
  const label = entry.label.trim();
  if (!label) return `${where}: chưa có tên hiển thị.`;
  if (label.length > MENU_LIMITS.label) return `${where}: tên hiển thị tối đa ${MENU_LIMITS.label} ký tự.`;
  if (!entry.path.trim()) return `${where}: chưa có đường dẫn.`;
  if (!classifyMenuUrl(entry.path)) return `${where}: đường dẫn "${entry.path.trim()}" không hợp lệ. ${URL_HELP}`;
  return null;
}
