import { apiClient } from "../client";

interface SignupRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      role: string;
      apiKey?: string;
    };
  };
  message?: string;
}

export const authService = {
  async login(data: SignupRequest): Promise<AuthResponse> {
    const { data: response } = await apiClient.post<AuthResponse>(
      "/auth/login",
      data
    );
    return response;
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const { data: response } = await apiClient.post<AuthResponse>(
      "/auth/register",
      data
    );
    return response;
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post("/auth/password-reset", { email });
    return data;
  },

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post("/auth/password-reset/confirm", {
      token,
      newPassword,
    });
    return data;
  },
};
