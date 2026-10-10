import { mergedProjects } from '@/utils/consignmentAdapters';
import type { Project, PaginatedResult, PaginationParams } from '@/types';

export const projectService = {
  getAll(): Project[] {
    return mergedProjects();
  },

  getFeatured(): Project[] {
    return mergedProjects().filter((p) => p.featured);
  },

  getBySlug(slug: string): Project | undefined {
    return mergedProjects().find((p) => p.slug === slug);
  },

  getById(id: string): Project | undefined {
    return mergedProjects().find((p) => p.id === id);
  },

  getByCategory(category: string): Project[] {
    return mergedProjects().filter((p) => p.category === category);
  },

  getRelated(currentId: string, limit: number = 3): Project[] {
    const projects = mergedProjects();
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
    const projects = mergedProjects();
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
