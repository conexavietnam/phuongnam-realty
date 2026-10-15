import { MENU_LIMITS, classifyMenuUrl, isMenuIcon, linkProblem } from '@/utils/menuConfig';
import type { MenuIconName } from '@/utils/menuConfig';
import { newId } from '@/utils/ids';
import type { MenuChild, MenuItem } from '@/types/common';

// Editing model of Cài đặt > Menu. `key` is the stable id of an entry (saved as `id`).
export interface DraftChild {
  key: string;
  label: string;
  path: string;
  visible: boolean;
  newTab: boolean;
}

export interface DraftItem extends DraftChild {
  exact: boolean;
  children: DraftChild[];
}

export interface DraftBottomItem {
  key: string;
  label: string;
  path: string;
  icon: MenuIconName;
  visible: boolean;
  exact: boolean;
}

export interface MenuDraft {
  desktop: DraftItem[];
  bottom: DraftBottomItem[];
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,60}$/;

// Keeps a stored id when it is valid and not used yet in the same list; otherwise makes a new one.
function uniqueKey(id: string | undefined, used: Set<string>): string {
  const key = id && ID_PATTERN.test(id) && !used.has(id) ? id : newId('m');
  used.add(key);
  return key;
}

function toDraftChild(child: MenuChild, used: Set<string>): DraftChild {
  return {
    key: uniqueKey(child.id, used),
    label: child.label,
    path: child.path,
    visible: child.visible !== false,
    newTab: child.newTab === true,
  };
}

export function toDraft(menu: { desktop?: MenuItem[]; mobileBottomNav?: MenuItem[] }): MenuDraft {
  const usedTop = new Set<string>();
  const usedBottom = new Set<string>();
  return {
    desktop: (menu.desktop ?? []).map((item) => {
      const usedChildren = new Set<string>();
      return {
        ...toDraftChild(item, usedTop),
        exact: item.exact === true,
        children: (item.children ?? []).map((child) => toDraftChild(child, usedChildren)),
      };
    }),
    bottom: (menu.mobileBottomNav ?? []).map((item) => ({
      key: uniqueKey(item.id, usedBottom),
      label: item.label,
      path: item.path,
      icon: isMenuIcon(item.icon) ? item.icon : 'Home',
      visible: item.visible !== false,
      exact: item.exact === true,
    })),
  };
}

const flags = (e: { visible: boolean; newTab?: boolean }) => ({
  ...(e.visible ? {} : { visible: false }),
  ...(e.newTab ? { newTab: true } : {}),
});

// What gets stored. Only non-default flags are written, so a plain entry stays {id, label, path}.
export function toConfig(draft: MenuDraft): { desktop: MenuItem[]; mobileBottomNav: MenuItem[] } {
  return {
    desktop: draft.desktop.map((item) => ({
      id: item.key,
      label: item.label.trim(),
      path: item.path.trim(),
      ...(item.exact ? { exact: true } : {}),
      ...flags(item),
      ...(item.children.length > 0
        ? { children: item.children.map((c) => ({ id: c.key, label: c.label.trim(), path: c.path.trim(), ...flags(c) })) }
        : {}),
    })),
    mobileBottomNav: draft.bottom.map((item) => ({
      id: item.key,
      label: item.label.trim(),
      path: item.path.trim(),
      icon: item.icon,
      ...(item.exact ? { exact: true } : {}),
      ...(item.visible ? {} : { visible: false }),
    })),
  };
}

// The first rule the draft breaks (Vietnamese), or null. Mirrors pn_valid_menu() on the server.
export function validateDraft(draft: MenuDraft): string | null {
  if (draft.desktop.length === 0) return 'Menu website cần ít nhất một mục.';
  if (draft.desktop.length > MENU_LIMITS.items) return `Menu website tối đa ${MENU_LIMITS.items} mục.`;
  if (!draft.desktop.some((item) => item.visible)) return 'Menu website cần ít nhất một mục đang hiển thị.';
  for (const [i, item] of draft.desktop.entries()) {
    const problem = linkProblem(item, `Menu website, mục ${i + 1}`);
    if (problem) return problem;
    if (item.children.length > MENU_LIMITS.children) return `Menu website, mục ${i + 1}: tối đa ${MENU_LIMITS.children} menu con.`;
    for (const [j, child] of item.children.entries()) {
      const childProblem = linkProblem(child, `Menu website, mục ${i + 1}, menu con ${j + 1}`);
      if (childProblem) return childProblem;
    }
  }
  if (draft.bottom.length === 0) return 'Thanh menu dưới cần ít nhất một mục.';
  if (draft.bottom.length > MENU_LIMITS.bottom) return `Thanh menu dưới tối đa ${MENU_LIMITS.bottom} mục.`;
  if (!draft.bottom.some((item) => item.visible)) return 'Thanh menu dưới cần ít nhất một mục đang hiển thị.';
  for (const [i, item] of draft.bottom.entries()) {
    const problem = linkProblem(item, `Thanh menu dưới, mục ${i + 1}`);
    if (problem) return problem;
  }
  return null;
}

// Inline hint for a single path field: only when something is typed and it is not usable.
export const pathHint = (path: string): string | null => (path.trim() !== '' && !classifyMenuUrl(path) ? 'Đường dẫn không hợp lệ.' : null);

export function swap<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const blankChild = (): DraftChild => ({ key: newId('m'), label: '', path: '', visible: true, newTab: false });

export const blankItem = (): DraftItem => ({ ...blankChild(), exact: false, children: [] });

export const blankBottom = (): DraftBottomItem => ({ key: newId('m'), label: '', path: '', icon: 'Home', visible: true, exact: false });
