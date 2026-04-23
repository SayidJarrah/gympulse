export type UserRole = 'USER' | 'ADMIN' | 'TRAINER';

/**
 * Combined-payload register request — matches the Kotlin DTO at
 * `backend/src/main/kotlin/com/gymflow/dto/RegisterRequest.kt`. Submitted from
 * the unified onboarding wizard at `terms`-step submission. See
 * `docs/sdd/onboarding-unified-signup.md` §2.1.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;       // E.164 (e.g. '+15555550100')
  dateOfBirth: string; // 'YYYY-MM-DD'
  agreeTerms: boolean;
  agreeWaiver: boolean;
}

// RegisterResponse is identical to LoginResponse — register returns tokens directly.
export type RegisterResponse = LoginResponse;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
  hasActiveMembership: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
}
