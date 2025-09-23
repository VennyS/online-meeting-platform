"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { roomService } from "@/app/services/room.service";
import { useUser } from "@/app/hooks/useUser";
import { toUtcISOString } from "@/app/lib/toUtcISOString";
import { formatDateTimeLocal } from "@/app/lib/formatDateTimeLocal";
import { fileService } from "@/app/services/file.service";
import { Permissions, RoomRole } from "@/app/types/room.types";

export default function CreateRoomModal() {
  const router = useRouter();
  const { user } = useUser();

  const now = new Date();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(formatDateTimeLocal(now));
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isPublic, setIsPublic] = useState(false);
  const [showHistoryToNewbies, setShowHistoryToNewbies] = useState(false);
  const [password, setPassword] = useState("");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [allowEarlyJoin, setAllowEarlyJoin] = useState(true);
  const [isConnectInstantly, setIsConnectInstantly] = useState(true);

  const [canShareScreen, setcanShareScreen] = useState<RoomRole | "all">("all");
  const [canSharePresentation, setCanSharePresentation] = useState<
    RoomRole | "all"
  >("all");

  const roleOptions: { label: string; value: RoomRole | "all" }[] = [
    { label: "Только владелец", value: "owner" },
    { label: "Владелец и админ", value: "admin" },
    { label: "Все", value: "all" },
  ];

  const handlePermissionChange = (
    permission: keyof Permissions,
    value: RoomRole | "all"
  ) => {
    if (permission === "canShareScreen") {
      setcanShareScreen(value);
    }
    setCanSharePresentation(value);
  };

  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleClose = () => {
    router.push("/");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const invalidFiles = selectedFiles.filter(
      (file) => file.type !== "application/pdf"
    );
    if (invalidFiles.length > 0) {
      setFiles([]);
      setUploadStatus("Пожалуйста, выберите только файлы в формате PDF");
      return;
    }
    setFiles(selectedFiles);
    setUploadStatus(null);
  };

  const handleUploadFiles = async (roomShortId: string) => {
    if (files.length === 0 || !roomShortId) {
      setUploadStatus("Выберите файлы и укажите shortId комнаты");
      return;
    }

    try {
      const urls = await fileService.uploadFiles(roomShortId, files);
      setUploadStatus(`Файлы успешно загружены: ${urls.join(", ")}`);
      setFiles([]);
    } catch (error) {
      console.error("Ошибка при загрузке файлов:", error);
      setUploadStatus(`Ошибка при загрузке файлов: ${error}`);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const startDate = startAt
        ? toUtcISOString(startAt, "Europe/Moscow")
        : undefined;

      const room = await roomService.createRoom({
        ownerId: user!.id,
        name,
        description,
        startAt: startDate,
        durationMinutes:
          durationMinutes === "" ? undefined : Number(durationMinutes),
        isPublic,
        showHistoryToNewbies,
        password,
        waitingRoomEnabled,
        allowEarlyJoin,
        timeZone: "Europe/Moscow",
        canShareScreen: canShareScreen,
        canSharePresentation: canSharePresentation,
      });

      await handleUploadFiles(room.shortId);

      if (isConnectInstantly) {
        var nextUrl = `/room/${room.shortId}`;
        if (password) {
          nextUrl += `/prejoin`;
        }
        router.push(nextUrl);
      } else {
        router.back();
      }
    } catch (error) {
      console.error("Ошибка при создании комнаты:", error);
    }
  };

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.17)",
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={handleClose} // клик по фону закрывает модалку
    >
      <div
        style={{
          background: "rgba(2, 1, 1, 1)",
          padding: 20,
          borderRadius: 12,
          minWidth: 300,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Создать комнату</h2>
        <div>
          <label htmlFor="name">Название:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Встреча команды"
          />
        </div>
        <div>
          <label htmlFor="description">Описание:</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
          />
        </div>
        <div>
          <label htmlFor="startAt">Дата и время начала (мск):</label>
          <input
            type="datetime-local"
            id="startAt"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            min={formatDateTimeLocal(now)}
          />
        </div>
        <div>
          <label htmlFor="duration">Длительность (минуты):</label>
          <input
            type="number"
            id="duration"
            value={durationMinutes}
            onChange={(e) =>
              setDurationMinutes(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            placeholder="Например: 60"
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            По ссылке без авторизации
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={showHistoryToNewbies}
              onChange={(e) => setShowHistoryToNewbies(e.target.checked)}
            />
            Показывать историю новым участникам
          </label>
        </div>
        <div>
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={waitingRoomEnabled}
              onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
            />
            Включить зал ожидания
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={allowEarlyJoin}
              onChange={(e) => setAllowEarlyJoin(e.target.checked)}
            />
            Разрешить ранний вход
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={isConnectInstantly}
              onChange={(e) => setIsConnectInstantly(e.target.checked)}
            />
            Сразу же подключится
          </label>
        </div>

        <h2>Права</h2>
        <div>
          <label>Может делиться экраном:</label>
          <select
            title="canShareScreen dropdown"
            value={canShareScreen}
            onChange={(e) =>
              handlePermissionChange(
                "canShareScreen",
                e.target.value as RoomRole | "all"
              )
            }
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Может делиться презентацией:</label>
          <select
            title="canStartPresentation dropdown"
            value={canSharePresentation}
            onChange={(e) =>
              handlePermissionChange(
                "canStartPresentation",
                e.target.value as RoomRole | "all"
              )
            }
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <h2>Загрузить PDF файлы в комнату</h2>
        <div>
          <label htmlFor="files">Выберите PDF файлы:</label>
          <input
            type="file"
            id="files"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
          />
        </div>
        {uploadStatus && <p>{uploadStatus}</p>}
        <button onClick={handleCreateRoom}>Создать</button>
        <button onClick={handleClose}>Отмена</button>
      </div>
    </div>
  );
}
