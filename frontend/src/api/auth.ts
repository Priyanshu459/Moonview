import { apiFetch } from './client.js';
import type { LoginRequest, AuthUserResponse } from '@moonview/shared';

export async function login(credentials: LoginRequest): Promise<void> {
  await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'POST',
  });
}

export async function getMe(): Promise<AuthUserResponse> {
  return apiFetch<AuthUserResponse>('/auth/me');
}
