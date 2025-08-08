import { axiosClassic } from "../api/interceptors";
import { IAuthResponse } from "../types/auth.types";

export const authService = {
  async checkToken() {
    const response = await axiosClassic.get<IAuthResponse>("/auth/check");
    return response.data;
  },
};
