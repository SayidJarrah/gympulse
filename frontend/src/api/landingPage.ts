import type { MembershipPlan } from '../types/membershipPlan'
import { getActivePlans } from './membershipPlans'

const LANDING_PAGE_SIZE = 100

export async function getLandingPlans(): Promise<MembershipPlan[]> {
  const response = await getActivePlans(0, LANDING_PAGE_SIZE)
  return response.content
}
