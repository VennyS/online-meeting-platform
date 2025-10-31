import { ReactNode } from "react";
import { createContext, useContext } from "react";
import { Socket } from "socket.io-client";
import {
  useParticipantsWithPermissions,
  ParticipantsWithPermissions,
} from "../hooks/useParticipantWithPermissions";

const ParticipantsContext = createContext<ParticipantsWithPermissions | null>(
  null
);

interface ParticipantsProviderProps {
  socket: Socket | null;
  children: ReactNode;
}

export function ParticipantsProvider({
  socket,
  children,
}: ParticipantsProviderProps) {
  const participantsData = useParticipantsWithPermissions(socket);

  return (
    <ParticipantsContext.Provider value={participantsData}>
      {children}
    </ParticipantsContext.Provider>
  );
}

export function useParticipantsContext() {
  const ctx = useContext(ParticipantsContext);
  if (!ctx) {
    throw new Error(
      "useParticipantsContext must be used within ParticipantsProvider"
    );
  }
  return ctx;
}
