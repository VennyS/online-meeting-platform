import { useEffect, useMemo, useState } from "react";
import { RoomSocket } from "../types/socket.types";
import { useChat as useLivekitChat } from "@livekit/components-react";
import { useUser } from "./useUser";
import { Message } from "../types/chat.types";

export interface ChatProviderValue {
  messages: Message[];
  send: (message: string) => void;
}

export function useChat(socket: RoomSocket | null): ChatProviderValue {
  const [messages, setMessages] = useState<Message[]>([]);
  const { send: sendLivekitMessage, chatMessages: rawLivekitMessages } =
    useLivekitChat();
  const { user } = useUser();

  const livekitMessages: Message[] = rawLivekitMessages.map((msg) => ({
    id: msg.id,
    text: msg.message,
    user: {
      id: Number(msg.from!.identity),
      firstName: msg.from!.name!,
    },
    createdAt: new Date(msg.timestamp),
  }));

  const allMessages = useMemo(() => {
    return [...messages, ...livekitMessages];
  }, [messages, livekitMessages]);

  const send = (message: string) => {
    if (message.trim() === "") return;

    sendLivekitMessage(message.trim());

    const newMessage: Omit<Message, "id" | "createdAt"> = {
      text: message,
      user: {
        id: user!.id,
        firstName: user!.firstName,
      },
    };

    socket?.emit("new_message", { message: newMessage });
  };

  useEffect(() => {
    if (!socket) return;

    const onInit = (data: { messages: Message[] }) => {
      console.log("MESSAGES: ", messages);
      setMessages(data.messages);
    };

    socket.on("init_chat", onInit);

    return () => {
      socket.off("init_chat", onInit);
    };
  });

  return {
    messages: allMessages,
    send,
  };
}
