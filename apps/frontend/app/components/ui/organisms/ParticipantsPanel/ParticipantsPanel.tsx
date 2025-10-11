import { RoomRole } from "@/app/types/room.types";
import styles from "./ParticipantsPanel.module.css";
import { useState } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ParticipantsList from "../ParticipantsList/ParticipantsList";
import Blacklist from "../BlackList/BlackList";
import WaitingGuestsList from "../WaitingGuestsList/WaitingGuestsList";
import PermissionsList from "../PermissionsList/PermissionsList";

export function ParticipantsPanel({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);

  const generateMeetingInfo = () => {
    const meetingDate = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const meetingLink = `${window.location.origin}/room/${roomId}`;

    return `Встреча: ${roomName}
Дата: ${meetingDate} (Москва)
Подключиться: ${meetingLink}`;
  };

  const handleCopy = async () => {
    const text = generateMeetingInfo();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Не удалось скопировать:", err);
      setManualText(text);
    }
  };

  return (
    <div className={styles.ParticipantsPanel}>
      <div className={styles.participantsSection}>
        <WaitingGuestsList />

        <div>
          <Typography
            variant="subtitle1"
            textTransform="uppercase"
            color="text.secondary"
            sx={{ mb: "8px" }}
          >
            На встрече
          </Typography>
          <ParticipantsList />
          <Blacklist />
          <PermissionsList />
        </div>
      </div>

      <Button onClick={handleCopy} variant="outlined">
        Поделиться встречей
      </Button>

      {copied && (
        <div className={styles.copiedToast}>Скопировано в буфер обмена</div>
      )}
      {manualText && (
        <div className={styles.manualCopy}>
          <div>Не удалось скопировать. Скопируйте вручную:</div>
          <textarea
            readOnly
            value={manualText}
            className={styles.manualTextarea}
          />
        </div>
      )}
    </div>
  );
}
