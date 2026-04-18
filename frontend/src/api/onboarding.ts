import axiosInstance from './axiosInstance'

export interface OnboardingPlanPendingRequest {
  planId: string
}

export interface OnboardingPlanPendingResponse {
  membershipId: string
  planId: string
  planName: string
  status: 'PLAN_PENDING'
}

export interface OnboardingCompleteResponse {
  onboardingCompletedAt: string // ISO 8601
}

export async function submitPlanPending(
  req: OnboardingPlanPendingRequest
): Promise<OnboardingPlanPendingResponse> {
  const response = await axiosInstance.post<OnboardingPlanPendingResponse>(
    '/onboarding/plan-pending',
    req
  )
  return response.data
}

export async function completeOnboarding(): Promise<OnboardingCompleteResponse> {
  const response = await axiosInstance.post<OnboardingCompleteResponse>(
    '/onboarding/complete'
  )
  return response.data
}
