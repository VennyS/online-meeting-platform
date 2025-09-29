import { useEffect, useMemo, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import {
  ChatWSMessage,
  ChatWSSendMessage,
  Message,
} from "../components/ui/organisms/Chat/types";
import { useChat as useLivekitChat } from "@livekit/components-react";
import { useUser } from "./useUser";

export interface UseChatReturn {
  messages: Message[];
  send: (message: string) => void;
}

export function useChat(): UseChatReturn {
  const { ws } = useWebSocket();
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

  function sendMessage<E extends ChatWSSendMessage["event"]>(
    event: E,
    data: Extract<ChatWSSendMessage, { event: E }>["data"]
  ) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event, data }));
  }

  const handleSend = async (message: string) => {
    if (message.trim() === "") return;

    sendLivekitMessage(message.trim());

    sendMessage("new_message", {
      message: {
        text: message,
        user: {
          id: user!.id,
          firstName: user!.firstName,
        },
      },
    });
  };

  useEffect(() => {
    if (!ws) return;

    ws.addEventListener("message", (event: MessageEvent) => {
      const message: ChatWSMessage = JSON.parse(event.data);
      const { event: evt, data } = message;

      switch (evt) {
        case "init_chat":
          setMessages(data.messages);
      }
    });
  }, [ws]);

  return {
    messages: allMessages,
    send: handleSend,
  };
}
