import axiosInstance from './axiosInstance'

export interface OnboardingMembershipRequest {
  planId: string
}

export interface OnboardingMembershipResponse {
  membershipId: string
  planId: string
  planName: string
  status: 'ACTIVE'
}

export interface OnboardingCompleteResponse {
  onboardingCompletedAt: string // ISO 8601
}

export async function submitMembership(
  req: OnboardingMembershipRequest
): Promise<OnboardingMembershipResponse> {
  const response = await axiosInstance.post<OnboardingMembershipResponse>(
    '/onboarding/membership',
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
