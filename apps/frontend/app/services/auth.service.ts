import { axiosClassic } from "../api/interceptors";
import { ICheckTokenResponse, IGetTokenResponse } from "../types/auth.types";

export const authService = {
  async checkToken() {
    const response = await axiosClassic.get<ICheckTokenResponse>("/auth/check");
    return response.data;
  },

  async getToken(room: string, name: string, password?: string) {
    try {
      const response = await axiosClassic.get<IGetTokenResponse>(
        "/auth/token",
        {
          params: { room, name, password },
        }
      );
      if (!response.data?.token) {
        throw new Error("Token not found in response");
      }
      return response.data;
    } catch (err) {
      throw err;
    }
  },
};
