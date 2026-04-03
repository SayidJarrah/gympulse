export type ScheduleView = 'week' | 'day' | 'list'

export interface GroupClassScheduleEntry {
  id: string;
  name: string;
  scheduledAt: string;
  localDate: string;
  durationMin: number;
  trainerNames: string[];
  classPhotoUrl: string | null;
}

export interface GroupClassScheduleResponse {
  view: ScheduleView;
  anchorDate: string;
  timeZone: string;
  week: string;
  rangeStartDate: string;
  rangeEndDateExclusive: string;
  entries: GroupClassScheduleEntry[];
}

export interface GetGroupClassScheduleParams {
  view: ScheduleView;
  anchorDate: string;
  timeZone: string;
}
