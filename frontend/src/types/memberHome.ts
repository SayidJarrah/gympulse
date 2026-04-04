export interface MemberHomeClassPreviewItem {
  id: string;
  name: string;
  scheduledAt: string;
  localDate: string;
  durationMin: number;
  trainerDisplayName: string;
  classPhotoUrl: string | null;
}

export interface MemberHomeClassPreviewResponse {
  timeZone: string;
  rangeStartDate: string;
  rangeEndDateExclusive: string;
  entries: MemberHomeClassPreviewItem[];
}

export interface GetMemberHomeClassesPreviewParams {
  timeZone: string;
}

export interface MemberHomeQuickAction {
  id:
    | 'manage-membership'
    | 'browse-plans'
    | 'open-schedule'
    | 'see-trainers'
    | 'jump-to-classes';
  label: string;
  description: string;
  to?: string;
}
