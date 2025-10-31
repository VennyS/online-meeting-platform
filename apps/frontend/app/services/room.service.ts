import { axiosClassic } from "../api/interceptors";
import { IUser } from "../types/auth.types";
import { MeetingReports } from "../types/reports.types";
import { Prequisites, Room } from "../types/room.types";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";

export const roomService = {
  async createRoom(data: CreateRoomDto) {
    const response = await axiosClassic.post<Room>("/room", data);
    return response.data;
  },

  async prequisites(roomShortId: string) {
    const response = await axiosClassic.get<Prequisites>(
      `/room/${roomShortId}/prequisites`
    );
    return response.data;
  },

  async getHistory(roomShortId: string) {
    const response = await axiosClassic.get<{ messages: any[] }>(
      `/room/${roomShortId}/history`
    );
    return response.data.messages;
  },

  async sendMessage(roomShortId: string, text: string, user: IUser) {
    const from = {
      id: user.id,
      firstName: user.firstName,
    };

    const response = await axiosClassic.post(`/room/${roomShortId}/messages`, {
      text,
      from,
    });
    return response.data;
  },

  async getRooms() {
    const response = await axiosClassic.get<Room[]>("/room");
    return response.data;
  },

  async getAll() {
    const response = await axiosClassic.get<Room[]>("/room/all");
    return response.data;
  },

  async updateRoom(roomShortId: string, data: UpdateRoomDto) {
    const response = await axiosClassic.patch<Room>(
      `/room/${roomShortId}`,
      data
    );
    return response.data;
  },

  async getMeetingReports(roomShortId: string) {
    const response = await axiosClassic.get<MeetingReports>(
      `/room/${roomShortId}/reports`
    );
    return response.data;
  },

  async downloadMeetingReportsExcel(roomShortId: string) {
    const response = await axiosClassic.get<Blob>(
      `/room/${roomShortId}/reports/excel`,
      {
        responseType: "blob",
      }
    );
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting_reports.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async downloadMeetingReportsCsv(roomShortId: string) {
    const response = await axiosClassic.get<string>(
      `/room/${roomShortId}/reports/csv`,
      {
        responseType: "text",
      }
    );
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting_reports.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};
