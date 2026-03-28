import axiosInstance from './axiosInstance'
import type {
  ClassTemplateRequest,
  ClassTemplateResponse,
  PaginatedTemplates,
} from '../types/scheduler'

export async function getClassTemplates(params: {
  search?: string;
  category?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedTemplates> {
  const response = await axiosInstance.get<PaginatedTemplates>('/admin/class-templates', { params })
  return response.data
}

export async function createClassTemplate(
  req: ClassTemplateRequest
): Promise<ClassTemplateResponse> {
  const response = await axiosInstance.post<ClassTemplateResponse>('/admin/class-templates', req)
  return response.data
}

export async function updateClassTemplate(
  id: string,
  req: ClassTemplateRequest
): Promise<ClassTemplateResponse> {
  const response = await axiosInstance.put<ClassTemplateResponse>(`/admin/class-templates/${id}`, req)
  return response.data
}

export async function deleteClassTemplate(id: string, force?: boolean): Promise<void> {
  await axiosInstance.delete(`/admin/class-templates/${id}`, { params: { force } })
}
