import { ReactNode } from "react";
import {
  ParticipantsWithPermissions,
  useParticipantsWithPermissions,
} from "../hooks/useParticipantsWithPermissions";
import { createContext, useContext } from "react";

const ParticipantsContext = createContext<ParticipantsWithPermissions | null>(
  null
);

interface ParticipantsProviderProps {
  ws: WebSocket | null;
  children: ReactNode;
}

export function ParticipantsProvider({
  ws,
  children,
}: ParticipantsProviderProps) {
  const participantsData = useParticipantsWithPermissions(ws);

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
