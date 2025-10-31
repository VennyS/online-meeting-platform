import { createContext, ReactNode, useContext } from "react";
import { Socket } from "socket.io-client";
import { RecordingProviderValue, useRecording } from "../hooks/useRecording";

const RecordingContext = createContext<RecordingProviderValue | null>(null);

interface RecordingProviderProps {
  socket: Socket | null;
  children: ReactNode;
}

export const RecordingProvider = ({
  socket,
  children,
}: RecordingProviderProps) => {
  const blacklistData = useRecording(socket);

  return (
    <RecordingContext.Provider value={blacklistData}>
      {children}
    </RecordingContext.Provider>
  );
};

export function useRecordingContext() {
  const ctx = useContext(RecordingContext);
  if (!ctx) {
    throw new Error(
      "useRecordingContext must be used within RecordingProvider"
    );
  }
  return ctx;
}
