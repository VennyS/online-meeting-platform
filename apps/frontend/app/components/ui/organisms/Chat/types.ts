import { WSMessage } from "@/app/types/room.types";

export type Message = {
  id: string;
  text: string;
  user: {
    id: number;
    firstName: string;
  };
  createdAt: Date;
};

export type ChatWSMessage = WSMessage<"init_chat", { messages: Message[] }>;
export type ChatWSSendMessage = WSMessage<
  "new_message",
  { message: Omit<Message, "id" | "createdAt"> }
>;
