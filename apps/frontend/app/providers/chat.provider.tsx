import { createContext, ReactNode, useContext } from "react";
import { Socket } from "socket.io-client";
import { ChatProviderValue, useChat } from "../hooks/useChat";

const ChatContext = createContext<ChatProviderValue | null>(null);

interface ChatProviderProps {
  socket: Socket | null;
  children: ReactNode;
}

export const ChatProvider = ({ socket, children }: ChatProviderProps) => {
  const ChatData = useChat(socket);

  return (
    <ChatContext.Provider value={ChatData}>{children}</ChatContext.Provider>
  );
};

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return ctx;
}
