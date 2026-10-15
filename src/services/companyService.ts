import { dataStorage } from '@/services/dataStorage';
import { renderableBottom, renderableNav } from '@/utils/menuConfig';
import type { BottomItem, NavItem } from '@/utils/menuConfig';
import type { CompanyInfo, CompanySeo, MenuConfig, MenuItem, FilterConfig, FooterConfig, Agent } from '@/types';

export const companyService = {
  getCompanyInfo(): CompanyInfo {
    return dataStorage.getCompany() as CompanyInfo;
  },

  saveSeo(seo: CompanySeo): Promise<void> {
    return dataStorage.saveCompany({ seo });
  },

  getMenuConfig(): MenuConfig {
    return dataStorage.getMenu();
  },

  // Header/drawer menu and bottom bar as they are shown: hidden and invalid entries removed.
  getNavigation(): { desktop: NavItem[]; bottom: BottomItem[] } {
    const menu = dataStorage.getMenu();
    return { desktop: renderableNav(menu.desktop), bottom: renderableBottom(menu.mobileBottomNav) };
  },

  getDefaultNavigation(): { desktop: MenuItem[]; mobileBottomNav: MenuItem[] } {
    return dataStorage.getDefaultNavigation();
  },

  saveNavigation(nav: { desktop: MenuItem[]; mobileBottomNav: MenuItem[] }): Promise<void> {
    return dataStorage.saveNavigation(nav);
  },

  getFooterConfig(): FooterConfig {
    return dataStorage.getMenu().footer ?? dataStorage.getDefaultFooter();
  },

  getDefaultFooterConfig(): FooterConfig {
    return dataStorage.getDefaultFooter();
  },

  saveFooterConfig(footer: FooterConfig): Promise<void> {
    return dataStorage.saveFooter(footer);
  },

  getFilterConfig(): FilterConfig {
    return dataStorage.getFilters();
  },

  saveFilterConfig(config: FilterConfig): Promise<void> {
    return dataStorage.saveFilters(config);
  },

  getAgents(): Agent[] {
    return dataStorage.getAgents();
  },

  getAgentById(id: string): Agent | undefined {
    return dataStorage.getAgents().find((agent) => agent.id === id);
  },
};
