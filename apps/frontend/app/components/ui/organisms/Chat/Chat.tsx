import { useState } from "react";
import styles from "./Chat.module.css";
import cn from "classnames";
import { parseMessage } from "@/app/lib/parseMessage";
import { useChat } from "@/app/hooks/useChat";
import { useUser } from "@/app/hooks/useUser";

export const Chat = () => {
  const { messages, send } = useChat();
  const { user } = useUser();
  const [message, setMessage] = useState("");

  const formatTime = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSend = () => {
    send(message);
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
        {messages.map((msg, index) => {
          const isMine = msg.user.id === user?.id;
          const from = isMine ? "Вы" : msg.user.firstName;

          return (
            <li
              key={index}
              className={cn(styles.chatLi, { [styles.myMessage]: isMine })}
            >
              <p className={styles.identity}>
                {from}
                <span>{formatTime(msg.createdAt)}</span>
              </p>
              <span>{parseMessage(msg.text)}</span>
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
