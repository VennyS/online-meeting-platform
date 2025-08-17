import { useState, useEffect } from "react";
import { useChat } from "@livekit/components-react";
import { useLocalParticipant } from "@livekit/components-react";
import { roomService } from "@/app/services/room.service";
import styles from "./Chat.module.css";
import cn from "classnames";
import { ChatProps } from "./types";

export const Chat = ({ roomName, user }: ChatProps) => {
  const { send: sendLivekitMessage } = useChat();
  const localParticipant = useLocalParticipant();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Подгружаем историю при монтировании
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await roomService.getHistory(roomName);
        setChatMessages(history);
      } catch (err) {
        console.error("Ошибка при получении истории:", err);
      }
    };

    fetchHistory();
  }, [roomName]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleSend = async () => {
    if (message.trim() === "") return;

    // Отправка через LiveKit для всех участников в комнате
    sendLivekitMessage(message.trim());

    // Сохраняем сообщение на бэке, если нужно
    try {
      const savedMessage = await roomService.sendMessage(
        roomName,
        message.trim(),
        user
      );
      setChatMessages((prev) => [...prev, savedMessage]);
    } catch (err) {
      console.error("Ошибка при отправке сообщения на бэкенд:", err);
    }

    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatWrapper}>
      <ul className={styles.messagesWrapper}>
        {chatMessages.map((msg, index) => {
          const isMine =
            msg.user?.id === user?.id ||
            msg.from?.sid === localParticipant.localParticipant.sid;
          const from = isMine
            ? "Вы"
            : msg.user?.firstName || msg.from?.identity || "Гость";

          return (
            <li
              key={index}
              className={cn(styles.chatLi, { [styles.myMessage]: isMine })}
            >
              <p className={styles.identity}>
                {from}
                <span>{formatTime(new Date(msg.createdAt).getTime())}</span>
              </p>
              <span>{msg.text || msg.message}</span>
            </li>
          );
        })}
      </ul>

      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          className={styles.chatInput}
        />
        <button onClick={handleSend} className={styles.sendButton}>
          Отправить
        </button>
      </div>
    </div>
  );
};
