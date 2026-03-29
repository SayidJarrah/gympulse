import axiosInstance from './axiosInstance'
import type {
  ClassInstancePatchRequest,
  ClassInstanceRequest,
  ClassInstanceResponse,
  CopyWeekResponse,
  ImportResultResponse,
  WeekScheduleResponse,
} from '../types/scheduler'

export async function getWeekSchedule(week: string): Promise<WeekScheduleResponse> {
  const response = await axiosInstance.get<WeekScheduleResponse>('/admin/class-instances', {
    params: { week },
  })
  return response.data
}

export async function createClassInstance(
  req: ClassInstanceRequest
): Promise<ClassInstanceResponse> {
  const response = await axiosInstance.post<ClassInstanceResponse>('/admin/class-instances', req)
  return response.data
}

export async function patchClassInstance(
  id: string,
  req: ClassInstancePatchRequest
): Promise<ClassInstanceResponse> {
  const response = await axiosInstance.patch<ClassInstanceResponse>(`/admin/class-instances/${id}`, req)
  return response.data
}

export async function deleteClassInstance(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/class-instances/${id}`)
}

export async function copyWeek(sourceWeek: string): Promise<CopyWeekResponse> {
  const response = await axiosInstance.post<CopyWeekResponse>('/admin/class-instances/copy-week', {
    sourceWeek,
  })
  return response.data
}

export async function importSchedule(file: File): Promise<ImportResultResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axiosInstance.post<ImportResultResponse>('/admin/schedule/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function exportScheduleCsv(week: string): Promise<Blob> {
  const response = await axiosInstance.get('/admin/schedule/export', {
    params: { week, format: 'csv' },
    responseType: 'blob',
  })
  return response.data
}

export async function exportScheduleIcal(week: string): Promise<Blob> {
  const response = await axiosInstance.get('/admin/schedule/export', {
    params: { week, format: 'ical' },
    responseType: 'blob',
  })
  return response.data
}
