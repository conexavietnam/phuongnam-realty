import { dataStorage } from '@/services/dataStorage';
import type { Project, PaginatedResult, PaginationParams } from '@/types';

export const projectService = {
  getAll(): Project[] {
    return dataStorage.getProjects();
  },

  getFeatured(): Project[] {
    return dataStorage.getProjects().filter((p) => p.featured);
  },

  getBySlug(slug: string): Project | undefined {
    return dataStorage.getProjectBySlug(slug);
  },

  getById(id: string): Project | undefined {
    return dataStorage.getProjects().find((p) => p.id === id);
  },

  getByCategory(category: string): Project[] {
    return dataStorage.getProjects().filter((p) => p.category === category);
  },

  getRelated(currentId: string, limit: number = 3): Project[] {
    const projects = dataStorage.getProjects();
    const current = projects.find((p) => p.id === currentId);
    if (current) {
      const sameCategory = projects.filter(
        (p) => p.id !== currentId && p.category === current.category
      );
      if (sameCategory.length >= limit) {
        return sameCategory.slice(0, limit);
      }
      const others = projects.filter(
        (p) => p.id !== currentId && p.category !== current.category
      );
      return [...sameCategory, ...others].slice(0, limit);
    }
    return projects.filter((p) => p.id !== currentId).slice(0, limit);
  },

  getPaginated(params: PaginationParams): PaginatedResult<Project> {
    const projects = dataStorage.getProjects();
    const { page, pageSize } = params;
    const start = (page - 1) * pageSize;
    const data = projects.slice(start, start + pageSize);
    return {
      data,
      total: projects.length,
      page,
      pageSize,
      totalPages: Math.ceil(projects.length / pageSize),
    };
  },
};
