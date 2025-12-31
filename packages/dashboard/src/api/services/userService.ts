import api from "../../services/api";
import { User } from "../../types";

export const userService = {
  getProfile: async (): Promise<User> => {
    const response = await api.get("/users/me");
    return response.data.user;
  },
  register: async (
    appName: string,
    description?: string | null,
    webhookUrl?: string | null
  ) => {
    const res = await api.post('/users/register', { appName, description, webhookUrl });
    return res.data;
  },
  getFeatures: async () => {
    const res = await api.get('/features');
    return res.data;
  },
  verifyCaptcha: async (token?: string) => {
    const res = await api.post('/captcha/verify', { token });
    return res.data;
  },
};
