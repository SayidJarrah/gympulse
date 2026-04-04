import axiosInstance from './axiosInstance'
import type { UserProfile, UpdateUserProfileRequest } from '../types/userProfile'

export async function getMyProfile(): Promise<UserProfile> {
  const response = await axiosInstance.get<UserProfile>('/profile/me')
  return response.data
}

export async function updateMyProfile(
  req: UpdateUserProfileRequest
): Promise<UserProfile> {
  const response = await axiosInstance.put<UserProfile>('/profile/me', req)
  return response.data
}

export async function uploadMyProfilePhoto(file: File): Promise<void> {
  const formData = new FormData()
  formData.append('photo', file)

  await axiosInstance.post('/profile/me/photo', formData)
}

export async function deleteMyProfilePhoto(): Promise<void> {
  await axiosInstance.delete('/profile/me/photo')
}

export async function getMyProfilePhotoBlob(): Promise<Blob> {
  const response = await axiosInstance.get<Blob>('/profile/me/photo', {
    responseType: 'blob',
  })
  return response.data
}

export async function getUserProfilePhotoBlob(userId: string): Promise<Blob> {
  const response = await axiosInstance.get<Blob>(`/admin/users/${userId}/photo`, {
    responseType: 'blob',
  })
  return response.data
}
