"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { roomService } from "@/app/services/room.service";
import { useUser } from "@/app/hooks/useUser";
import { toUtcISOString } from "@/app/lib/toUtcISOString";
import { formatDateTimeLocal } from "@/app/lib/formatDateTimeLocal";
import { fileService } from "@/app/services/file.service";
import { Permissions, Role, IRoom } from "@/app/types/room.types";
import { Modal } from "@/app/components/ui/atoms/Modal/Modal";

interface RoomModalProps {
  mode: "create" | "edit";
  initialData?: IRoom; // если редактируем — передаем комнату
  onClose: () => void;
}

export default function RoomModal({
  mode,
  initialData,
  onClose,
}: RoomModalProps) {
  const router = useRouter();
  const { user } = useUser();

  const now = new Date();

  // ----------- Состояния формы -----------
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [startAt, setStartAt] = useState(
    formatDateTimeLocal(
      initialData?.startAt ? new Date(initialData.startAt) : now
    )
  );
  const [durationMinutes, setDurationMinutes] = useState<number | "">(
    initialData?.durationMinutes ?? ""
  );
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [showHistoryToNewbies, setShowHistoryToNewbies] = useState(
    initialData?.showHistoryToNewbies ?? false
  );
  const [password, setPassword] = useState("");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(
    initialData?.waitingRoomEnabled ?? false
  );
  const [allowEarlyJoin, setAllowEarlyJoin] = useState(
    initialData?.allowEarlyJoin ?? true
  );
  const [isConnectInstantly, setIsConnectInstantly] = useState(true);

  const [canShareScreen, setCanShareScreen] = useState<Role>(
    initialData?.canShareScreen ?? "ALL"
  );
  const [canStartPresentation, setCanSharePresentation] = useState<Role>(
    initialData?.canStartPresentation ?? "ALL"
  );

  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const roleOptions: { label: string; value: Role }[] = [
    { label: "Только владелец", value: "OWNER" },
    { label: "Владелец и админ", value: "ADMIN" },
    { label: "Все", value: "ALL" },
  ];

  const handlePermissionChange = (
    permission: keyof Permissions,
    value: Role
  ) => {
    if (permission === "canShareScreen") setCanShareScreen(value);
    else setCanSharePresentation(value);
  };

  // ----------- Файлы -----------
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
    if (files.length === 0) return;
    try {
      const urls = await fileService.uploadFiles(roomShortId, files);
      setUploadStatus(`Файлы успешно загружены: ${urls.join(", ")}`);
      setFiles([]);
    } catch (error) {
      console.error(error);
      setUploadStatus(`Ошибка при загрузке файлов: ${error}`);
    }
  };

  // ----------- Сабмит формы -----------
  const handleSubmit = async () => {
    try {
      const startDate = startAt
        ? toUtcISOString(startAt, "Europe/Moscow")
        : undefined;

      if (mode === "create") {
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
          canShareScreen,
          canStartPresentation,
        });

        await handleUploadFiles(room.shortId);

        if (isConnectInstantly) {
          let nextUrl = `/room/${room.shortId}`;
          if (password) nextUrl += `/prejoin`;
          router.push(nextUrl);
        } else {
          onClose();
        }
      } else if (mode === "edit" && initialData) {
        await roomService.updateRoom(initialData.shortId, {
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
          canShareScreen,
          canStartPresentation,
        });

        await handleUploadFiles(initialData.shortId);
        onClose();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>{mode === "edit" ? "Редактировать комнату" : "Создать комнату"}</h2>

      {/* Общие поля */}
      <div>
        <label>Название:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label>Описание:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label>Дата и время начала:</label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          min={formatDateTimeLocal(now)}
        />
      </div>
      <div>
        <label>Длительность (минуты):</label>
        <input
          type="number"
          value={durationMinutes}
          onChange={(e) =>
            setDurationMinutes(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
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
        <label>Пароль:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

      {/* Права */}
      <div>
        <label>Может делиться экраном:</label>
        <select
          value={canShareScreen}
          onChange={(e) =>
            handlePermissionChange("canShareScreen", e.target.value as Role)
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
          value={canStartPresentation}
          onChange={(e) =>
            handlePermissionChange(
              "canStartPresentation",
              e.target.value as Role
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

      {/* Файлы */}
      <div>
        <label>Выберите PDF файлы:</label>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
        />
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>

      {/* Кнопки */}
      <button onClick={handleSubmit}>
        {mode === "edit" ? "Сохранить" : "Создать"}
      </button>
      <button onClick={onClose}>Отмена</button>
    </Modal>
  );
}
