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
