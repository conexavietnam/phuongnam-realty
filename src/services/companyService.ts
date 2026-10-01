import companyData from '@/data/company.json';
import menuData from '@/data/menu.json';
import filtersData from '@/data/filters.json';
import agentsData from '@/data/agents.json';
import consignmentsData from '@/data/consignments.json';
import type { CompanyInfo, MenuConfig, FilterConfig, Agent, ConsignmentProject } from '@/types';

const companyInfo = companyData as CompanyInfo;
const menuConfig = menuData as MenuConfig;
const filterConfig = filtersData as FilterConfig;
const agents = agentsData as Agent[];
const consignments = consignmentsData as ConsignmentProject[];

export const companyService = {
  getCompanyInfo(): CompanyInfo {
    return companyInfo;
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
    return consignments;
  },

  getConsignmentBySlug(slug: string): ConsignmentProject | undefined {
    return consignments.find((item) => item.slug === slug);
  },
};
