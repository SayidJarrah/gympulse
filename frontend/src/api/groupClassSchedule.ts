import axiosInstance from './axiosInstance'
import type {
  GetGroupClassScheduleParams,
  GroupClassScheduleResponse,
} from '../types/groupClassSchedule'

export async function getGroupClassSchedule(
  params: GetGroupClassScheduleParams
): Promise<GroupClassScheduleResponse> {
  const response = await axiosInstance.get<GroupClassScheduleResponse>('/class-schedule', {
    params: {
      view: params.view,
      anchorDate: params.anchorDate,
      timeZone: params.timeZone,
    },
  })
  return response.data
}
