import { Building2, Handshake, Heart, Home, Info, Key, Landmark, Mail, MapPin, Newspaper, Phone, Search, Send, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MenuIconName } from '@/utils/menuConfig';

// Components for the allow-listed bottom bar icons (names: MENU_ICON_NAMES in src/utils/menuConfig.ts).
export const MENU_ICONS: Record<MenuIconName, LucideIcon> = {
  Home,
  Building2,
  Send,
  Newspaper,
  Phone,
  Mail,
  MapPin,
  Search,
  Heart,
  User,
  Info,
  Handshake,
  Key,
  Landmark,
};
