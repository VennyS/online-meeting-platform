import { useEffect, useState } from "react";
import { RoomSocket } from "../types/socket.types";
import { RoomFile } from "../types/files.types";

export interface RecordingProviderValue {
  overflowInfo:
    | {
        totalVideoSize: number;
        constraint: number;
        causedById: number;
      }
    | undefined;
  startRecording: () => void;
  stopRecording: () => void;
  deleteFiles: (files: RoomFile[]) => void;
  resetOverflowInfo: () => void;
}

export interface OverflowInfo {
  totalVideoSize: number;
  constraint: number;
  causedById: number;
}

export function useRecording(
  socket: RoomSocket | null
): RecordingProviderValue {
  const [egressId, setEgressId] = useState<string>();
  const [overflowInfo, setOverflowInfo] = useState<OverflowInfo>();

  function startRecording() {
    socket?.emit("recording_started", {});
  }

  function stopRecording() {
    if (!egressId) return;
    socket?.emit("recording_finished", { egressId });
  }

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

  const resetOverflowInfo = () => {
    setOverflowInfo(undefined);
  };

  useEffect(() => {
    if (!socket) return;

    const onRecordingStarted = (data: { egressId: string }) => {
      setEgressId(data.egressId);
    };

    const onRecordingFinished = (data: { egressId: string }) => {
      setEgressId(undefined);
    };
    const onStorageOverflow = (data: OverflowInfo) => {
      setOverflowInfo(data);
    };

    socket.on("recording_started", onRecordingStarted);
    socket.on("recording_finished", onRecordingFinished);
    socket.on("recording_storage_overflow", onStorageOverflow);

    return () => {
      socket.off("recording_started", onRecordingStarted);
      socket.off("recording_finished", onRecordingFinished);
      socket.off("recording_storage_overflow", onStorageOverflow);
    };
  });

  return {
    overflowInfo,
    startRecording,
    stopRecording,
    deleteFiles,
    resetOverflowInfo,
  };
}
