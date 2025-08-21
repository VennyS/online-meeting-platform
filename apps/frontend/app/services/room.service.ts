import { axiosClassic } from "../api/interceptors";
import { IUser } from "../types/auth.types";
import { IPrequisites, IRoom } from "../types/room.types";

export const roomService = {
  async createRoom(
    ownerId: number,
    isPublic: boolean,
    showHistoryToNewbies: boolean,
    password?: string
  ) {
    const response = await axiosClassic.post<IRoom>("/room", {
      ownerId,
      isPublic,
      showHistoryToNewbies,
      password,
    });
    return response.data;
  },

  async prequisites(shortId: string) {
    const response = await axiosClassic.get<IPrequisites>(
      `/room/${shortId}/prequisites`
    );
    return response.data;
  },

  async getHistory(shortId: string) {
    const response = await axiosClassic.get<{ messages: any[] }>(
      `/room/${shortId}/history`
    );
    return response.data.messages;
  },

  async sendMessage(shortId: string, text: string, user: IUser) {
    const response = await axiosClassic.post(`/room/${shortId}/messages`, {
      text,
      user,
    });
    return response.data;
  },
};
