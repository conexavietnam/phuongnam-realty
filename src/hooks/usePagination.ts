import { useState, useCallback } from 'react';

export interface UsePaginationProps {
  totalItems: number;
  pageSize?: number;
  initialPage?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePagination({
  totalItems,
  pageSize = 12,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(() => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const hasNextPage = validPage < totalPages;
  const hasPrevPage = validPage > 1;

  return {
    currentPage: validPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  };
}
