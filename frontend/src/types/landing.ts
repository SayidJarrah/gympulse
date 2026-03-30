export type LandingAction =
  | { kind: 'link'; label: string; to: string }
  | { kind: 'disabled'; label: string; description: string };

export interface LandingPlanAction {
  label: string;
  to: string;
  variant: 'primary' | 'secondary';
}

export interface ResolvedLandingActions {
  headerPrimary: LandingAction;
  heroPrimary: LandingAction;
  heroSecondary: LandingAction;
  planAction: LandingPlanAction;
}
