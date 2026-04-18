export type ViewerState = 'booked' | 'nobooked' | 'loggedOut';

export interface TrainerRef {
  id: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface UpcomingClass {
  id: string;
  name: string;
  startsAt: string; // ISO — drives countdown
  trainer: TrainerRef;
  studio: string;
  durationMin: number;
}

export interface NextOpenClass {
  id: string;
  name: string;
  startsIn: string; // e.g. "45 min"
  startsAt: string;
  trainer: TrainerRef;
  studio: string;
  spotsLeft: number;
  remainingClassesToday: number;
}

export interface LoggedOutViewerState {
  state: 'loggedOut';
}

export interface BookedViewerState {
  state: 'booked';
  firstName: string;
  onTheFloor: number;
  upcomingClass: UpcomingClass;
}

export interface NoBookedViewerState {
  state: 'nobooked';
  firstName: string;
  onTheFloor: number;
  nextOpenClass: NextOpenClass | null;
}

export type ViewerStateResponse =
  | LoggedOutViewerState
  | BookedViewerState
  | NoBookedViewerState;

export interface ActivityEvent {
  id: string;
  kind: 'checkin' | 'booking' | 'pr' | 'class';
  actor: string;
  text: string;
  at: string; // ISO
}

export interface AuthedStats {
  variant: 'authed';
  onTheFloor: number;
  classesToday: number;
  tightestClass: { name: string; spotsLeft: number } | null;
}

export interface PublicStats {
  variant: 'public';
  memberCount: number;
  classesToday: number;
  coachCount: number;
}

export type LandingStats = AuthedStats | PublicStats;
