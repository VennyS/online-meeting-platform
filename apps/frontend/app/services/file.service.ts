import { axiosClassic } from "../api/interceptors";

interface UploadFileResponse {
  message: string;
  urls: string[];
}

export interface IFile {
  id: number;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  url: string;
}

export type FileType = "VIDEO" | "AUDIO" | "TEXT" | "PDF";

export const fileService = {
  async uploadFiles(shortId: string, files: File[]): Promise<string[]> {
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
      `/file/${shortId}/batch`,
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
    shortId: string,
    skip = 0,
    take = 10,
    types?: FileType | FileType[]
  ): Promise<IFile[]> {
    try {
      // если пришёл один тип, преобразуем его в массив
      const normalizedTypes = Array.isArray(types)
        ? types
        : types
        ? [types]
        : [];

      const response = await axiosClassic.get<IFile[]>(
        `/file/room/${shortId}`,
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

  async listUser(types?: FileType | FileType[]): Promise<IFile[]> {
    try {
      // если пришёл один тип, преобразуем его в массив
      const normalizedTypes = Array.isArray(types)
        ? types
        : types
        ? [types]
        : [];

      const response = await axiosClassic.get<IFile[]>(`/file`, {
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

  async patch(fileId: number, fileName: string): Promise<IFile> {
    const response = await axiosClassic.patch<IFile>(`/file/${fileId}`, {
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
