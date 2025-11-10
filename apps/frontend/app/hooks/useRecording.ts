import { useEffect, useState } from "react";
import { RoomSocket } from "../types/socket.types";
import { RoomFile } from "../types/files.types";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

export interface RecordingProviderValue {
  overflowInfo:
    | {
        totalVideoSize: number;
        constraint: number;
        causedById: number;
      }
    | undefined;
  isRecording: boolean;
  recordingPending: boolean;
  recordingStatusInfo?: RecordingStatusInfo;
  startRecording: () => void;
  stopRecording: () => void;
  deleteFiles: (files: RoomFile[]) => void;
  resetOverflowInfo: () => void;
  handleRecordingClick: () => void;
  resetStatus: () => void;
}

export interface OverflowInfo {
  totalVideoSize: number;
  constraint: number;
  causedById: number;
}

export interface RecordingStatusInfo {
  severity: "success" | "info" | "warning" | "error";
  text: string;
}

export function useRecording(
  socket: RoomSocket | null
): RecordingProviderValue {
  const [egressId, setEgressId] = useState<string>();
  const [overflowInfo, setOverflowInfo] = useState<OverflowInfo>();
  const room = useRoomContext();
  const [isRecording, setIsRecording] = useState(room.isRecording);
  const [recordingPending, setRecordingPending] = useState(false);
  const [recordingStatusInfo, setRecordingStatusInfo] =
    useState<RecordingStatusInfo>();

  function resetStatus() {
    setRecordingStatusInfo(undefined);
  }

  function startRecording() {
    socket?.emit("recording_started", {});
  }

  function stopRecording() {
    if (!egressId) return;
    socket?.emit("recording_finished", { egressId });
  }

  const handleRecordingClick = () => {
    setRecordingPending(!isRecording);
    isRecording ? stopRecording() : startRecording();
  };

  function deleteFiles(files: RoomFile[]) {
    const sizeOfFiles = files.reduce((acc, file) => acc + file.fileSize, 0);
    setOverflowInfo((prev) => {
      if (!prev) return prev;
      return {
        totalVideoSize: prev.totalVideoSize - sizeOfFiles,
        constraint: prev.constraint,
        causedById: prev.causedById,
      };
    });
  }

  function resetOverflowInfo() {
    setOverflowInfo(undefined);
  }

  useEffect(() => {
    if (!socket) return;

    const onRecordingStarted = (data: { egressId: string }) => {
      setEgressId(data.egressId);
      setRecordingStatusInfo({
        text: "Начата запись встречи",
        severity: "info",
      });
    };

    const onRecordingFinished = (data: { egressId: string }) => {
      setEgressId(undefined);
      setRecordingStatusInfo({
        text: "Запись встречи закончена",
        severity: "info",
      });
    };

    const onStorageOverflow = (data: OverflowInfo) => {
      setOverflowInfo(data);
    };

    const onRecordingError = () => {
      setRecordingPending(false);
      setRecordingStatusInfo({
        text: "Ошибка записи. Попробуйте позже",
        severity: "error",
      });
    };

    socket.on("recording_started", onRecordingStarted);
    socket.on("recording_finished", onRecordingFinished);
    socket.on("recording_storage_overflow", onStorageOverflow);
    socket.on("recording_error", onRecordingError);

    return () => {
      socket.off("recording_started", onRecordingStarted);
      socket.off("recording_finished", onRecordingFinished);
      socket.off("recording_storage_overflow", onStorageOverflow);
      socket.off("recording_error", onRecordingError);
    };
  });

  useEffect(() => {
    if (!room) return;

    const handleStatus = (recording: boolean) => {
      setRecordingPending(false);
      setIsRecording(recording);
    };

    room.on(RoomEvent.RecordingStatusChanged, handleStatus);

    return () => {
      room.off(RoomEvent.RecordingStatusChanged, handleStatus);
    };
  }, [room]);

  return {
    overflowInfo,
    isRecording,
    recordingPending,
    recordingStatusInfo,
    startRecording,
    stopRecording,
    deleteFiles,
    resetOverflowInfo,
    handleRecordingClick,
    resetStatus,
  };
}
