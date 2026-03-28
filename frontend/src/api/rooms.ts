import axiosInstance from './axiosInstance'
import type {
  PaginatedRooms,
  RoomHasInstancesResponse,
  RoomRequest,
  RoomResponse,
} from '../types/scheduler'

export async function getRooms(params: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedRooms> {
  const response = await axiosInstance.get<PaginatedRooms>('/rooms', { params })
  return response.data
}

export async function createRoom(req: RoomRequest): Promise<RoomResponse> {
  const response = await axiosInstance.post<RoomResponse>('/rooms', req)
  return response.data
}

export async function updateRoom(id: string, req: RoomRequest): Promise<RoomResponse> {
  const response = await axiosInstance.put<RoomResponse>(`/rooms/${id}`, req)
  return response.data
}

export async function deleteRoom(id: string, force?: boolean): Promise<RoomHasInstancesResponse | null> {
  const response = await axiosInstance.delete<RoomHasInstancesResponse | ''>(
    `/rooms/${id}`,
    { params: { force } }
  )
  if (response.data && typeof response.data === 'object' && 'code' in response.data) {
    return response.data as RoomHasInstancesResponse
  }
  return null
}
