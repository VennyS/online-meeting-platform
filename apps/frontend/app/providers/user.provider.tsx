"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IUser } from "../types/auth.types";
import { authService } from "../services/auth.service";
import {
  removeAccessToken,
  saveAccessToken,
} from "../services/auth-token.service";
import { usePathname } from "next/navigation";
import { fileService, IFile } from "../services/file.service";

interface AuthContextType {
  user: IUser | null;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  loading: boolean;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;

  totalPdfSize: number;
  addFiles: (files: File[]) => void;
  removeFiles: (files: IFile[]) => void;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<IUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = React.useState<string | null>(null);

  const [totalPdfSize, setTotalPdfSize] = React.useState(0);

  const addFiles = (files: File[]) => {
    const pdfSize = files
      .filter((f) => f.type === "application/pdf")
      .reduce((sum, f) => sum + f.size, 0);
    setTotalPdfSize((prev) => prev + pdfSize);
  };

  const removeFiles = (files: IFile[]) => {
    const pdfSize = files
      .filter((f) => f.fileType === "PDF")
      .reduce((sum, f) => sum + f.fileSize, 0);
    setTotalPdfSize((prev) => Math.max(0, prev - pdfSize));
  };

  const isRoomPage =
    (pathname?.startsWith("/room/") || pathname.startsWith("/redirect")) ??
    false;

  React.useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const data = await authService.checkToken();
        saveAccessToken(data.token);
        setUser(data.user);
      } catch (error) {
        if (!isRoomPage) {
          removeAccessToken();
          router.replace("https://ru.noimann.academy/");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  React.useEffect(() => {
    const fetchTotalPdfWeight = async () => {
      try {
        const { totalSize } = await fileService.getTotalSize("PDF");
        setTotalPdfSize(totalSize);
      } catch (err) {
        console.error("Failed to fetch total PDF size:", err);
      }
    };

    fetchTotalPdfWeight();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        token,
        setToken,
        totalPdfSize,
        addFiles,
        removeFiles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
