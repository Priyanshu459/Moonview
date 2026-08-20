// =============================================================================
// Moonview — Shared Auth Types
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: AuthUserResponse;
  };
  error?: string;
}
