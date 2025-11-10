import { createContext, useContext, useEffect, useState } from "react";
import { Prequisites } from "../types/room.types";
import { useParams } from "next/navigation";
import { roomService } from "../services/room.service";
import { AxiosError } from "axios";
import router from "next/router";

interface PrequisitesContextValue {
  prequisites: Prequisites;
  isLoading: boolean;
}

const PrequisitesContext = createContext<PrequisitesContextValue | null>(null);

export const PrequisitesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { roomShortId } = useParams() as { roomShortId: string };

  const [isLoading, setIsLoading] = useState(true);
  const [prequisites, setPrequisites] = useState<Prequisites>({
    guestAllowed: false,
    passwordRequired: false,
    waitingRoomEnabled: false,
    isOwner: false,
    allowEarlyJoin: false,
    name: "",
    description: "",
    startAt: new Date(),
    cancelled: false,
    isFinished: false,
    isBlackListed: false,
  });

  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!roomShortId) return;

      try {
        setIsLoading(true);
        const data = await roomService.prequisites(roomShortId);

        setPrequisites(data);
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 404) {
          router.replace("/404");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkPrerequisites();
  }, [roomShortId]);

  return (
    <PrequisitesContext.Provider value={{ prequisites, isLoading }}>
      {children}
    </PrequisitesContext.Provider>
  );
};

export const usePrequisites = () => {
  const ctx = useContext(PrequisitesContext);
  if (!ctx) {
    throw new Error("usePrequisites must be used within a PrequisitesProvider");
  }
  return ctx;
};
