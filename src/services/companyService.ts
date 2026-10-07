import { dataStorage } from '@/services/dataStorage';
import type { CompanyInfo, MenuConfig, FilterConfig, FooterConfig, Agent, ConsignmentProject } from '@/types';

export const companyService = {
  getCompanyInfo(): CompanyInfo {
    return dataStorage.getCompany() as CompanyInfo;
  },

  getMenuConfig(): MenuConfig {
    return dataStorage.getMenu();
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

  getConsignments(): ConsignmentProject[] {
    return dataStorage.getConsignmentProjects();
  },

  getConsignmentBySlug(slug: string): ConsignmentProject | undefined {
    return dataStorage.getConsignmentProjects().find((item) => item.slug === slug);
  },
};
