import axiosInstance from './axiosInstance'
import type { MembershipPlan, MembershipPlanRequest, PaginatedPlans, PlanStatus } from '../types/membershipPlan'

// Public endpoints — no auth header required (Axios interceptor skips if token is absent)

export async function getActivePlans(
  page = 0,
  size = 20,
  sort = 'createdAt,desc'
): Promise<PaginatedPlans> {
  const response = await axiosInstance.get<PaginatedPlans>('/membership-plans', {
    params: { page, size, sort },
  })
  return response.data
}

export async function getPlanById(id: string): Promise<MembershipPlan> {
  const response = await axiosInstance.get<MembershipPlan>(`/membership-plans/${id}`)
  return response.data
}

// Admin endpoints — Axios interceptor attaches Authorization header automatically

export async function createPlan(req: MembershipPlanRequest): Promise<MembershipPlan> {
  const response = await axiosInstance.post<MembershipPlan>('/membership-plans', req)
  return response.data
}

export async function updatePlan(id: string, req: MembershipPlanRequest): Promise<MembershipPlan> {
  const response = await axiosInstance.put<MembershipPlan>(`/membership-plans/${id}`, req)
  return response.data
}

export async function deactivatePlan(id: string): Promise<MembershipPlan> {
  const response = await axiosInstance.patch<MembershipPlan>(`/membership-plans/${id}/deactivate`)
  return response.data
}

export async function activatePlan(id: string): Promise<MembershipPlan> {
  const response = await axiosInstance.patch<MembershipPlan>(`/membership-plans/${id}/activate`)
  return response.data
}

export async function getAdminPlans(
  status?: PlanStatus,
  page = 0,
  size = 20,
  sort = 'createdAt,desc'
): Promise<PaginatedPlans> {
  const response = await axiosInstance.get<PaginatedPlans>('/admin/membership-plans', {
    params: {
      ...(status !== undefined ? { status } : {}),
      page,
      size,
      sort,
    },
  })
  return response.data
}
