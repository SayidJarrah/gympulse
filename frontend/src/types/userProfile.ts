export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  fitnessGoals: string[];
  preferredClassTypes: string[];
  emergencyContact: EmergencyContact | null;
  bio: string | null;
  hasProfilePhoto: boolean;
  profilePhotoUrl: string | null;
  onboardingCompletedAt: string | null; // ISO 8601 or null
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  fitnessGoals: string[];
  preferredClassTypes: string[];
  emergencyContact: EmergencyContact | null;
  bio: string | null;
}
