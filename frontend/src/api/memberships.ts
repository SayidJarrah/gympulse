import axiosInstance from './axiosInstance'
import type {
  UserMembership,
  MembershipPurchaseRequest,
  MembershipStatus,
  PaginatedMemberships,
} from '../types/userMembership'

// User endpoints — require authenticated Axios instance (token attached by interceptor)

export async function purchaseMembership(
  req: MembershipPurchaseRequest
): Promise<UserMembership> {
  const response = await axiosInstance.post<UserMembership>('/memberships', req)
  return response.data
}

export async function getMyMembership(): Promise<UserMembership> {
  const response = await axiosInstance.get<UserMembership>('/memberships/me')
  return response.data
}

export async function cancelMyMembership(): Promise<UserMembership> {
  const response = await axiosInstance.delete<UserMembership>('/memberships/me')
  return response.data
}

// Admin endpoints

export async function getAdminMemberships(
  status?: MembershipStatus,
  userId?: string,
  page = 0,
  size = 20,
  sort = 'createdAt,desc'
): Promise<PaginatedMemberships> {
  const response = await axiosInstance.get<PaginatedMemberships>('/admin/memberships', {
    params: {
      ...(status !== undefined ? { status } : {}),
      ...(userId !== undefined && userId !== '' ? { userId } : {}),
      page,
      size,
      sort,
    },
  })
  return response.data
}

export async function adminCancelMembership(
  membershipId: string
): Promise<UserMembership> {
  const response = await axiosInstance.delete<UserMembership>(
    `/admin/memberships/${membershipId}`
  )
  return response.data
}
