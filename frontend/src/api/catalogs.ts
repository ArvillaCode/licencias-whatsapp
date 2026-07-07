import { api } from './client';
import type { CatalogItem } from '../types/models';

function buildCatalogApi(basePath: string) {
  return {
    list: () => api.get<CatalogItem[]>(basePath),
    create: (name: string) => api.post<CatalogItem>(basePath, { name }),
    update: (id: number, input: Partial<Pick<CatalogItem, 'name' | 'active'>>) =>
      api.put<CatalogItem>(`${basePath}/${id}`, input),
    remove: (id: number) => api.delete<void>(`${basePath}/${id}`),
  };
}

export const paymentMethodsApi = buildCatalogApi('/payment-methods');
export const responsiblesApi = buildCatalogApi('/responsibles');
