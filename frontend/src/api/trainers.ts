import axiosInstance from './axiosInstance'
import type {
  PaginatedTrainers,
  TrainerRequest,
  TrainerResponse,
} from '../types/scheduler'

export async function getTrainers(params: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedTrainers> {
  const response = await axiosInstance.get<PaginatedTrainers>('/admin/trainers', { params })
  return response.data
}

export async function getTrainer(id: string): Promise<TrainerResponse> {
  const response = await axiosInstance.get<TrainerResponse>(`/admin/trainers/${id}`)
  return response.data
}

export async function createTrainer(req: TrainerRequest): Promise<TrainerResponse> {
  const response = await axiosInstance.post<TrainerResponse>('/admin/trainers', req)
  return response.data
}

export async function updateTrainer(id: string, req: TrainerRequest): Promise<TrainerResponse> {
  const response = await axiosInstance.put<TrainerResponse>(`/admin/trainers/${id}`, req)
  return response.data
}

export async function deleteTrainer(id: string, force?: boolean): Promise<void> {
  await axiosInstance.delete(`/admin/trainers/${id}`, { params: { force } })
}

export async function uploadTrainerPhoto(id: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('photo', file)

  await axiosInstance.post(`/admin/trainers/${id}/photo`, formData)
}

export function getTrainerPhotoUrl(id: string): string {
  return `/api/v1/trainers/${id}/photo`
}

export async function deleteTrainerPhoto(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/trainers/${id}/photo`)
}
