import { axiosClassic } from "../api/interceptors";
import { IUser } from "../types/auth.types";
import {
  CreateRoomDto,
  IPrequisites,
  IRoom,
  UpdateRoomDto,
} from "../types/room.types";

export const roomService = {
  async createRoom(data: CreateRoomDto) {
    const response = await axiosClassic.post<IRoom>("/room", data);
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

  async getRooms() {
    const response = await axiosClassic.get<IRoom[]>("/room");
    return response.data;
  },

  async updateRoom(shortId: string, data: UpdateRoomDto) {
    const response = await axiosClassic.put<IRoom>(`/room/${shortId}`, data);
    return response.data;
  },
};
