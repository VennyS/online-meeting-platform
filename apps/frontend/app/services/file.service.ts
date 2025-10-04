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

  async list(
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

      const response = await axiosClassic.get<IFile[]>(`/file/${shortId}`, {
        params: {
          skip,
          take,
          type: normalizedTypes,
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
};
