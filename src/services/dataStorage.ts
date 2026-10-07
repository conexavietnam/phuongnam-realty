// Data-access layer. Reads are synchronous from an in-memory cache that is filled
// from the PHP API at startup (bundled JSON is the read-only fallback); writes update
// the cache optimistically and persist through the API. Swapping the backend later
// only requires changing this file and apiClient.ts.
import type { Project } from '@/types/project';
import type { Property } from '@/types/property';
import type { NewsArticle } from '@/types/news';
import type { Agent, ConsignmentProject } from '@/types/contact';
import type { FilterConfig, FooterConfig, MenuConfig } from '@/types/common';

import initialProjects from '@/data/projects.json';
import initialProperties from '@/data/properties.json';
import initialNews from '@/data/news.json';
import initialCompany from '@/data/company.json';
import initialConsignments from '@/data/consignments.json';
import initialAgents from '@/data/agents.json';
import initialMenu from '@/data/menu.json';
import initialFilters from '@/data/filters.json';
import { api } from '@/services/apiClient';

export const DATA_CHANGED_EVENT = 'pn_data_changed';

export interface CustomerLead {
  id: string;
  fullName: string;
  phone: string;
  purpose: 'ban' | 'cho-thue' | 'tu-van';
  region?: string;
  propertyType?: string;
  priceRange?: string;
  note?: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'completed' | 'cancelled';
  source: 'consignment' | 'contact';
}

type Company = typeof initialCompany & { heroBannerImage?: string; logoImage?: string };

interface Collections {
  projects: Project[];
  properties: Property[];
  news: NewsArticle[];
  agents: Agent[];
  consignments: ConsignmentProject[];
  company: Company;
  menu: MenuConfig;
  filters: FilterConfig;
  customer_leads: CustomerLead[];
}

type CollectionName = keyof Collections;
type PublicCollectionName = Exclude<CollectionName, 'customer_leads'>;

const OBJECT_COLLECTIONS: CollectionName[] = ['company', 'menu', 'filters'];
const PUBLIC_COLLECTIONS: PublicCollectionName[] = [
  'projects',
  'properties',
  'news',
  'agents',
  'consignments',
  'company',
  'menu',
  'filters',
];

const BUNDLED: Collections = {
  projects: initialProjects as unknown as Project[],
  properties: initialProperties as unknown as Property[],
  news: initialNews as unknown as NewsArticle[],
  agents: initialAgents as unknown as Agent[],
  consignments: initialConsignments as unknown as ConsignmentProject[],
  company: initialCompany,
  menu: initialMenu as unknown as MenuConfig,
  filters: initialFilters as unknown as FilterConfig,
  customer_leads: [],
};

const cache: Collections = { ...BUNDLED };

function hasValidShape(name: CollectionName, value: unknown): boolean {
  if (OBJECT_COLLECTIONS.includes(name)) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  return Array.isArray(value);
}

function emitChange(): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}

async function pull<K extends CollectionName>(name: K): Promise<void> {
  const value = await api.getData<unknown>(name);
  if (hasValidShape(name, value)) {
    cache[name] = value as Collections[K];
  }
}

async function persist(name: CollectionName): Promise<void> {
  try {
    await api.putData(name, cache[name]);
  } catch (err) {
    await pull(name).catch(() => undefined);
    emitChange();
    throw err;
  }
}

async function commit<K extends CollectionName>(name: K, value: Collections[K]): Promise<void> {
  cache[name] = value;
  emitChange();
  await persist(name);
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index < 0) return [item, ...list];
  const next = [...list];
  next[index] = item;
  return next;
}

export const dataStorage = {
  // Load public collections from the API; bundled JSON stays in place when it is unreachable.
  async init(): Promise<void> {
    await Promise.allSettled(PUBLIC_COLLECTIONS.map((name) => pull(name)));
  },

  // Admin only: refresh everything including leads (requires a valid session).
  async loadAdmin(): Promise<void> {
    await Promise.all([this.init(), pull('customer_leads')]);
    emitChange();
  },

  // === PROJECTS ===
  getProjects(): Project[] {
    return cache.projects;
  },

  getProjectBySlug(slug: string): Project | undefined {
    return cache.projects.find((p) => p.slug === slug);
  },

  saveProject(project: Project): Promise<void> {
    return commit('projects', upsert(cache.projects, project));
  },

  deleteProject(id: string): Promise<void> {
    return commit('projects', cache.projects.filter((p) => p.id !== id));
  },

  // === PROPERTIES ===
  getProperties(): Property[] {
    return cache.properties;
  },

  getPropertyBySlug(slug: string): Property | undefined {
    return cache.properties.find((p) => p.slug === slug);
  },

  saveProperty(property: Property): Promise<void> {
    return commit('properties', upsert(cache.properties, property));
  },

  deleteProperty(id: string): Promise<void> {
    return commit('properties', cache.properties.filter((p) => p.id !== id));
  },

  // === NEWS ===
  getNews(): NewsArticle[] {
    return cache.news;
  },

  getNewsBySlug(slug: string): NewsArticle | undefined {
    return cache.news.find((n) => n.slug === slug);
  },

  saveNews(article: NewsArticle): Promise<void> {
    return commit('news', upsert(cache.news, article));
  },

  deleteNews(id: string): Promise<void> {
    return commit('news', cache.news.filter((n) => n.id !== id));
  },

  // === COMPANY, MENU, FILTERS, AGENTS (site configuration) ===
  getCompany(): Company {
    return cache.company;
  },

  saveCompany(info: Partial<Company>): Promise<void> {
    return commit('company', { ...cache.company, ...info });
  },

  getMenu(): MenuConfig {
    return cache.menu;
  },

  getDefaultFooter(): FooterConfig {
    return (BUNDLED.menu.footer as FooterConfig);
  },

  saveFooter(footer: FooterConfig): Promise<void> {
    return commit('menu', { ...cache.menu, footer });
  },

  getFilters(): FilterConfig {
    return cache.filters;
  },

  saveFilters(config: FilterConfig): Promise<void> {
    return commit('filters', config);
  },

  getAgents(): Agent[] {
    return cache.agents;
  },

  // === CONSIGNMENT PROJECTS ===
  getConsignmentProjects(): ConsignmentProject[] {
    return cache.consignments;
  },

  // === CUSTOMER LEADS (created through POST lead, managed here by admin) ===
  getCustomerLeads(): CustomerLead[] {
    return cache.customer_leads;
  },

  updateLeadStatus(id: string, status: CustomerLead['status']): Promise<void> {
    return commit(
      'customer_leads',
      cache.customer_leads.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );
  },

  deleteLead(id: string): Promise<void> {
    return commit('customer_leads', cache.customer_leads.filter((l) => l.id !== id));
  },

  // === BACKUP & RESTORE ===
  exportAllData(): string {
    return JSON.stringify(
      {
        projects: cache.projects,
        properties: cache.properties,
        news: cache.news,
        company: cache.company,
        consignments: cache.consignments,
        leads: cache.customer_leads,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  },

  // Resolves false when the file is not a valid backup; rejects when the server refuses the write.
  async importAllData(jsonStr: string): Promise<boolean> {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      return false;
    }
    const mapping: Array<[string, CollectionName]> = [
      ['projects', 'projects'],
      ['properties', 'properties'],
      ['news', 'news'],
      ['company', 'company'],
      ['consignments', 'consignments'],
      ['leads', 'customer_leads'],
    ];
    const present = mapping.filter(([key]) => data[key] !== undefined);
    if (present.length === 0 || present.some(([key, name]) => !hasValidShape(name, data[key]))) {
      return false;
    }
    for (const [key, name] of present) {
      await commit(name, data[key] as Collections[typeof name]);
    }
    return true;
  },

  async resetToDefault(): Promise<void> {
    const names: CollectionName[] = ['projects', 'properties', 'news', 'company', 'consignments'];
    for (const name of names) {
      await commit(name, BUNDLED[name] as Collections[typeof name]);
    }
  },
};
