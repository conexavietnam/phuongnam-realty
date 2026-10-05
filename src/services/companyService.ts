import { dataStorage } from '@/services/dataStorage';
import menuData from '@/data/menu.json';
import filtersData from '@/data/filters.json';
import agentsData from '@/data/agents.json';
import type { CompanyInfo, MenuConfig, FilterConfig, Agent, ConsignmentProject } from '@/types';

const menuConfig = menuData as MenuConfig;
const filterConfig = filtersData as FilterConfig;
const agents = agentsData as Agent[];

export const companyService = {
  getCompanyInfo(): CompanyInfo {
    return dataStorage.getCompany() as CompanyInfo;
  },

  getMenuConfig(): MenuConfig {
    return menuConfig;
  },

  getFilterConfig(): FilterConfig {
    return filterConfig;
  },

  getAgents(): Agent[] {
    return agents;
  },

  getAgentById(id: string): Agent | undefined {
    return agents.find((agent) => agent.id === id);
  },

  getConsignments(): ConsignmentProject[] {
    return dataStorage.getConsignmentProjects();
  },

  getConsignmentBySlug(slug: string): ConsignmentProject | undefined {
    return dataStorage.getConsignmentProjects().find((item) => item.slug === slug);
  },
};
