import { axiosClassic } from "../api/interceptors";
import { FileType, RoomFile } from "../types/files.types";
import { UploadFileResponse } from "./dto/upload-file.response";

export const fileService = {
  async uploadFiles(roomShortId: string, files: File[]): Promise<string[]> {
    const invalidFiles = files.filter(
      (file) => file.type !== "application/pdf"
    );
    if (invalidFiles.length > 0) {
      throw new Error("Only PDF files are allowed");
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await axiosClassic.post<UploadFileResponse>(
      `/file/${roomShortId}/batch`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.urls;
  },

  async listRoom(
    roomShortId: string,
    skip = 0,
    take = 10,
    types?: FileType | FileType[]
  ): Promise<RoomFile[]> {
    try {
      // если пришёл один тип, преобразуем его в массив
      const normalizedTypes = Array.isArray(types)
        ? types
        : types
        ? [types]
        : [];

      const response = await axiosClassic.get<RoomFile[]>(
        `/file/room/${roomShortId}`,
        {
          params: {
            skip,
            take,
            type: normalizedTypes,
          },
          paramsSerializer: (params) =>
            new URLSearchParams(
              Object.entries(params).flatMap(([key, value]) =>
                Array.isArray(value)
                  ? value.map((v) => [key, v])
                  : [[key, value]]
              )
            ).toString(),
        }
      );

      return response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        return [];
      }
      throw err;
    }
  },

  async listUser(types?: FileType | FileType[]): Promise<RoomFile[]> {
    try {
      // если пришёл один тип, преобразуем его в массив
      const normalizedTypes = Array.isArray(types)
        ? types
        : types
        ? [types]
        : [];

      const response = await axiosClassic.get<RoomFile[]>(`/file`, {
        params: {
          types: normalizedTypes,
        },
        paramsSerializer: (params) =>
          new URLSearchParams(
            Object.entries(params).flatMap(([key, value]) =>
              Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
            )
          ).toString(),
      });

      return response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        return [];
      }
      throw err;
    }
  },

  async delete(fileId: number): Promise<void> {
    await axiosClassic.delete(`/file/${fileId}`);
  },

  async patch(fileId: number, fileName: string): Promise<RoomFile> {
    const response = await axiosClassic.patch<RoomFile>(`/file/${fileId}`, {
      name: fileName,
    });
    return response.data;
  },

  async getTotalSize(
    types?: FileType | FileType[]
  ): Promise<{ totalSize: number }> {
    const normalizedTypes = Array.isArray(types) ? types : types ? [types] : [];

    const response = await axiosClassic.get<{ totalSize: number }>(
      `/file/storage/size`,
      {
        params: { types: normalizedTypes },
        paramsSerializer: (params) =>
          new URLSearchParams(
            Object.entries(params).flatMap(([key, value]) =>
              Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
            )
          ).toString(),
      }
    );

    return response.data;
  },
};
