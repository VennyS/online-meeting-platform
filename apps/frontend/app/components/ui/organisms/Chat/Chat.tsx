import { useState, useEffect } from "react";
import { useChat, useLocalParticipant } from "@livekit/components-react";
import { roomService } from "@/app/services/room.service";
import styles from "./Chat.module.css";
import cn from "classnames";
import { ChatProps } from "./types";

export const Chat = ({ roomName, user }: ChatProps) => {
  const { send: sendLivekitMessage, chatMessages } = useChat();
  const localParticipant = useLocalParticipant();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  // Загружаем историю с бэка при монтировании
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await roomService.getHistory(roomName);
        setHistory(history);
      } catch (err) {
        console.error("Ошибка при получении истории:", err);
      }
    };

    fetchHistory();
  }, [roomName]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSend = async () => {
    if (message.trim() === "") return;

    // Отправка в LiveKit
    sendLivekitMessage(message.trim());

    // Отправка на бэк
    try {
      await roomService.sendMessage(roomName, message.trim(), user);
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

  // Соединяем историю + livekit сообщения
  const allMessages = [
    ...history,
    ...chatMessages.map((msg) => ({
      text: msg.message,
      createdAt: msg.timestamp,
      from: msg.from,
    })),
  ];

  return (
    <div className={styles.chatWrapper}>
      <ul className={styles.messagesWrapper}>
        {allMessages.map((msg, index) => {
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
                <span>{formatTime(msg.createdAt || msg.timestamp)}</span>
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
