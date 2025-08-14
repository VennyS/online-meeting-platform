import { axiosClassic } from "../api/interceptors";
import { IRoom } from "../types/room.types";

export const roomService = {
  async createRoom(ownerId: number, isPublic: boolean) {
    const response = await axiosClassic.post<IRoom>("/room", {
      ownerId,
      isPublic,
    });
    return response.data;
  },

  async guestAllowed(shortId: string) {
    const response = await axiosClassic.get<{ guestAllowed: boolean }>(
      `/room/${shortId}/guest-allowed`
    );
    return response.data;
  },
};
