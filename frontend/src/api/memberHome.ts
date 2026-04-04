import type { MembershipPlan } from '../types/membershipPlan'
import type { TrainerDiscoveryResponse } from '../types/trainerDiscovery'
import type {
  GetMemberHomeClassesPreviewParams,
  MemberHomeClassPreviewResponse,
} from '../types/memberHome'
import { getActivePlans } from './membershipPlans'
import { listTrainers } from './trainerDiscovery'
import axiosInstance from './axiosInstance'

export async function getMemberHomeClassesPreview(
  params: GetMemberHomeClassesPreviewParams
): Promise<MemberHomeClassPreviewResponse> {
  const response = await axiosInstance.get<MemberHomeClassPreviewResponse>(
    '/member-home/classes-preview',
    {
      params,
    }
  )
  return response.data
}

export async function getMemberHomeTrainerPreview(): Promise<TrainerDiscoveryResponse[]> {
  const response = await listTrainers({
    page: 0,
    size: 6,
    sort: 'experienceYears,desc',
  })
  return response.content
}

export async function getMemberHomePlanTeasers(): Promise<MembershipPlan[]> {
  const response = await getActivePlans(0, 3, 'createdAt,desc')
  return response.content
}
