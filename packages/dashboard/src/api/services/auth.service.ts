import { apiClient } from "../client";

interface SignupRequest {
  email: string;
  password: string;
}

interface SignupResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    apiKey: string;
  };
  message: string;
}

export const authService = {
  async signup(data: SignupRequest): Promise<SignupResponse> {
    const { data: response } = await apiClient.post<SignupResponse>(
      "/auth/signup",
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
