import axiosInstance from './axiosInstance'
import type {
  PaginatedTrainerDiscoveryResponse,
  TrainerFavoriteResponse,
  TrainerProfileResponse,
  TrainerDiscoverySortOption,
} from '../types/trainerDiscovery'

export interface ListTrainersParams {
  specialization?: string[];
  sort?: TrainerDiscoverySortOption;
  page?: number;
  size?: number;
}

function buildTrainerParams(params: ListTrainersParams): URLSearchParams {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.page !== undefined) searchParams.set('page', String(params.page))
  if (params.size !== undefined) searchParams.set('size', String(params.size))
  params.specialization?.forEach((value) => {
    searchParams.append('specialization', value)
  })
  return searchParams
}

export async function listTrainers(
  params: ListTrainersParams
): Promise<PaginatedTrainerDiscoveryResponse> {
  const { data } = await axiosInstance.get<PaginatedTrainerDiscoveryResponse>('/trainers', {
    params: buildTrainerParams(params),
  })
  return data
}

export async function getTrainerProfile(id: string): Promise<TrainerProfileResponse> {
  const { data } = await axiosInstance.get<TrainerProfileResponse>(`/trainers/${id}`)
  return data
}

export async function getMyFavoriteTrainers(params: {
  sort?: TrainerDiscoverySortOption;
  page?: number;
  size?: number;
}): Promise<PaginatedTrainerDiscoveryResponse> {
  const { data } = await axiosInstance.get<PaginatedTrainerDiscoveryResponse>(
    '/trainers/favorites',
    {
      params: buildTrainerParams({
        sort: params.sort,
        page: params.page,
        size: params.size,
      }),
    }
  )
  return data
}

export async function addFavorite(trainerId: string): Promise<TrainerFavoriteResponse> {
  const { data } = await axiosInstance.post<TrainerFavoriteResponse>(
    `/trainers/${trainerId}/favorites`
  )
  return data
}

export async function removeFavorite(trainerId: string): Promise<void> {
  await axiosInstance.delete(`/trainers/${trainerId}/favorites`)
}

export async function getDistinctSpecializations(): Promise<string[]> {
  const { content } = await listTrainers({ sort: 'lastName,asc', page: 0, size: 200 })
  const all = content.flatMap((trainer) => trainer.specializations)
  const normalized = new Map<string, string>()
  all.forEach((value) => {
    const key = value.toLowerCase()
    if (!normalized.has(key)) {
      normalized.set(key, value)
    }
  })
  return Array.from(normalized.values()).sort((a, b) => a.localeCompare(b))
}
