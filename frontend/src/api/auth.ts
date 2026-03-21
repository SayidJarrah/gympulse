import axiosInstance from './axiosInstance'
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
} from '../types/auth'

export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  const response = await axiosInstance.post<RegisterResponse>('/auth/register', req)
  return response.data
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const response = await axiosInstance.post<LoginResponse>('/auth/login', req)
  return response.data
}

export async function refreshTokens(req: RefreshRequest): Promise<LoginResponse> {
  const response = await axiosInstance.post<LoginResponse>('/auth/refresh', req)
  return response.data
}

export async function logout(refreshToken: string): Promise<void> {
  await axiosInstance.post('/auth/logout', { refreshToken })
}
