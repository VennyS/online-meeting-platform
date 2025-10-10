import { roomService } from "@/app/services/room.service";
import {
  MeetingReport,
  MeetingReports,
  Participant,
  ParticipantSession,
} from "@/app/types/room.types";
import { useEffect, useState } from "react";
import Modal from "../../atoms/Modal/Modal";
import { RoomReportsProps } from "./types";

export const RoomReportsModal = ({
  shortId,
  isOpen,
  onClose,
}: RoomReportsProps) => {
  const [reports, setReports] = useState<MeetingReports | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await roomService.getMeetingReports(shortId);
        setReports(data);
      } catch (err) {
        setError("Не удалось загрузить отчёты о встречах");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [shortId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <button onClick={onClose}>Закрыть</button>
      {loading && <p>Загрузка...</p>}
      {error && <p>{error}</p>}
      {reports && reports.sessions.length === 0 ? (
        <p>Нет доступных отчётов о встречах</p>
      ) : (
        <>
          <button
            onClick={() => roomService.downloadMeetingReportsExcel(shortId)}
            style={{
              background: "orange",
              color: "white",
              padding: "5px 10px",
              marginRight: "5px",
            }}
          >
            Скачать Excel
          </button>

          <button
            onClick={() => roomService.downloadMeetingReportsCsv(shortId)}
            style={{
              background: "purple",
              color: "white",
              padding: "5px 10px",
            }}
          >
            Скачать CSV
          </button>
        </>
      )}
      {reports &&
        reports.sessions.map((session: MeetingReport) => (
          <div key={session.id}>
            <h3>Сессия встречи</h3>
            <p>Начало: {formatDateTime(session.startTime)}</p>
            <p>
              Конец:{" "}
              {session.endTime
                ? formatDateTime(session.endTime)
                : "Все еще идет"}
            </p>
            {!!session.duration && (
              <p>Длительность: {formatDuration(session.duration)}</p>
            )}
            <h4>Участники</h4>
            <ul>
              {session.participants.map((participant: Participant) => (
                <li key={participant.id}>
                  <p>
                    {participant.name} (ID: {participant.userId})
                  </p>
                  <ul>
                    {participant.sessions.map(
                      (s: ParticipantSession, index: number) => (
                        <li key={index}>
                          Вход: {formatDateTime(s.joinTime)}
                          {s.leaveTime &&
                            `, Выход: ${formatDateTime(s.leaveTime)}`}
                        </li>
                      )
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </Modal>
  );
};

/**
 * Форматирует дату: если есть часы → ч:м:с, если только минуты → м:с, если только секунды → с
 */
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} ч${minutes > 0 ? ` ${minutes} мин` : ""}${
      seconds > 0 ? ` ${seconds} сек` : ""
    }`;
  }
  if (minutes > 0) {
    return `${minutes} мин${seconds > 0 ? ` ${seconds} сек` : ""}`;
  }
  return `${seconds} сек`;
}
