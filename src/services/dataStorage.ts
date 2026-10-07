import type { Project } from '@/types/project';
import type { Property } from '@/types/property';
import type { NewsArticle } from '@/types/news';
import type { ConsignmentProject } from '@/types/contact';
import type { CompanyInfo } from '@/types/common';

import initialProjects from '@/data/projects.json';
import initialProperties from '@/data/properties.json';
import initialNews from '@/data/news.json';
import initialCompany from '@/data/company.json';
import initialConsignments from '@/data/consignments.json';

const STORAGE_KEYS = {
  PROJECTS: 'pn_storage_projects',
  PROPERTIES: 'pn_storage_properties',
  NEWS: 'pn_storage_news',
  COMPANY: 'pn_storage_company',
  CONSIGNMENTS: 'pn_storage_consignments',
  CUSTOMER_LEADS: 'pn_storage_customer_leads',
};

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

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('pn_data_changed', { detail: { key } }));
  } catch (e) {
    console.warn(`Error saving ${key} to storage:`, e);
  }
}

export const dataStorage = {
  // === PROJECTS ===
  getProjects(): Project[] {
    return getFromStorage<Project[]>(
      STORAGE_KEYS.PROJECTS,
      initialProjects as unknown as Project[],
    );
  },

  getProjectBySlug(slug: string): Project | undefined {
    return this.getProjects().find((p) => p.slug === slug);
  },

  saveProject(project: Project): void {
    const list = this.getProjects();
    const index = list.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      list[index] = project;
    } else {
      list.unshift(project);
    }
    saveToStorage(STORAGE_KEYS.PROJECTS, list);
  },

  deleteProject(id: string): void {
    const list = this.getProjects().filter((p) => p.id !== id);
    saveToStorage(STORAGE_KEYS.PROJECTS, list);
  },

  // === PROPERTIES ===
  getProperties(): Property[] {
    return getFromStorage<Property[]>(
      STORAGE_KEYS.PROPERTIES,
      initialProperties as unknown as Property[],
    );
  },

  getPropertyBySlug(slug: string): Property | undefined {
    return this.getProperties().find((p) => p.slug === slug);
  },

  saveProperty(property: Property): void {
    const list = this.getProperties();
    const index = list.findIndex((p) => p.id === property.id);
    if (index >= 0) {
      list[index] = property;
    } else {
      list.unshift(property);
    }
    saveToStorage(STORAGE_KEYS.PROPERTIES, list);
  },

  deleteProperty(id: string): void {
    const list = this.getProperties().filter((p) => p.id !== id);
    saveToStorage(STORAGE_KEYS.PROPERTIES, list);
  },

  // === NEWS ===
  getNews(): NewsArticle[] {
    return getFromStorage<NewsArticle[]>(
      STORAGE_KEYS.NEWS,
      initialNews as unknown as NewsArticle[],
    );
  },

  getNewsBySlug(slug: string): NewsArticle | undefined {
    return this.getNews().find((n) => n.slug === slug);
  },

  saveNews(article: NewsArticle): void {
    const list = this.getNews();
    const index = list.findIndex((n) => n.id === article.id);
    if (index >= 0) {
      list[index] = article;
    } else {
      list.unshift(article);
    }
    saveToStorage(STORAGE_KEYS.NEWS, list);
  },

  deleteNews(id: string): void {
    const list = this.getNews().filter((n) => n.id !== id);
    saveToStorage(STORAGE_KEYS.NEWS, list);
  },

  // === COMPANY INFO ===
  getCompany(): CompanyInfo {
    return getFromStorage<CompanyInfo>(STORAGE_KEYS.COMPANY, initialCompany as unknown as CompanyInfo);
  },

  saveCompany(info: Partial<CompanyInfo>): CompanyInfo {
    const current = this.getCompany();
    const updated = { ...current, ...info };
    saveToStorage(STORAGE_KEYS.COMPANY, updated);
    return updated;
  },

  // === CONSIGNMENT PROJECTS ===
  getConsignmentProjects(): ConsignmentProject[] {
    return getFromStorage<ConsignmentProject[]>(
      STORAGE_KEYS.CONSIGNMENTS,
      initialConsignments as unknown as ConsignmentProject[],
    );
  },

  saveConsignmentProject(item: ConsignmentProject): void {
    const list = this.getConsignmentProjects();
    const index = list.findIndex((c) => c.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }
    saveToStorage(STORAGE_KEYS.CONSIGNMENTS, list);
  },

  deleteConsignmentProject(id: string): void {
    const list = this.getConsignmentProjects().filter((c) => c.id !== id);
    saveToStorage(STORAGE_KEYS.CONSIGNMENTS, list);
  },

  // === CUSTOMER LEADS & CONSIGNMENT SUBMISSIONS ===
  getCustomerLeads(): CustomerLead[] {
    return getFromStorage<CustomerLead[]>(STORAGE_KEYS.CUSTOMER_LEADS, [
      {
        id: 'lead-01',
        fullName: 'Nguyễn Văn Minh',
        phone: '0912 345 678',
        purpose: 'ban',
        region: 'quan-2',
        propertyType: 'can-ho',
        priceRange: '4-6',
        note: 'Cần bán gấp căn 2PN Palm River view sông',
        createdAt: '2025-02-15T09:30:00Z',
        status: 'new',
        source: 'consignment',
      },
      {
        id: 'lead-02',
        fullName: 'Phạm Thị Mai',
        phone: '0988 765 432',
        purpose: 'cho-thue',
        region: 'nha-be',
        propertyType: 'biet-thu',
        priceRange: 'tren-10',
        note: 'Ký gửi cho thuê biệt thự đảo hoàn thiện nội thất',
        createdAt: '2025-02-18T14:20:00Z',
        status: 'contacted',
        source: 'consignment',
      },
    ]);
  },

  addCustomerLead(lead: Omit<CustomerLead, 'id' | 'createdAt' | 'status'>): CustomerLead {
    const leads = this.getCustomerLeads();
    const newLead: CustomerLead = {
      ...lead,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    leads.unshift(newLead);
    saveToStorage(STORAGE_KEYS.CUSTOMER_LEADS, leads);
    return newLead;
  },

  updateLeadStatus(id: string, status: CustomerLead['status']): void {
    const leads = this.getCustomerLeads();
    const item = leads.find((l) => l.id === id);
    if (item) {
      item.status = status;
      saveToStorage(STORAGE_KEYS.CUSTOMER_LEADS, leads);
    }
  },

  deleteLead(id: string): void {
    const leads = this.getCustomerLeads().filter((l) => l.id !== id);
    saveToStorage(STORAGE_KEYS.CUSTOMER_LEADS, leads);
  },

  // === BACKUP & RESTORE ===
  exportAllData(): string {
    return JSON.stringify(
      {
        projects: this.getProjects(),
        properties: this.getProperties(),
        news: this.getNews(),
        company: this.getCompany(),
        consignments: this.getConsignmentProjects(),
        leads: this.getCustomerLeads(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  },

  importAllData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.projects) saveToStorage(STORAGE_KEYS.PROJECTS, data.projects);
      if (data.properties) saveToStorage(STORAGE_KEYS.PROPERTIES, data.properties);
      if (data.news) saveToStorage(STORAGE_KEYS.NEWS, data.news);
      if (data.company) saveToStorage(STORAGE_KEYS.COMPANY, data.company);
      if (data.consignments) saveToStorage(STORAGE_KEYS.CONSIGNMENTS, data.consignments);
      if (data.leads) saveToStorage(STORAGE_KEYS.CUSTOMER_LEADS, data.leads);
      return true;
    } catch {
      return false;
    }
  },

  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.PROPERTIES);
    localStorage.removeItem(STORAGE_KEYS.NEWS);
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    localStorage.removeItem(STORAGE_KEYS.CONSIGNMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_LEADS);
    window.dispatchEvent(new CustomEvent('pn_data_changed', { detail: { reset: true } }));
  },
};
