export type UserRole = 'USER' | 'ADMIN' | 'TRAINER';

export interface RegisterRequest {
  email: string;
  password: string;
}

// RegisterResponse is now identical to LoginResponse — register returns tokens directly
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
