import { renderHook, act } from "@testing-library/react";
import { useRecording, OverflowInfo } from "./useRecording";
import { RoomFile } from "../types/files.types";
import React from "react";

// Mock LiveKit hooks properly - без ссылок на внешние переменные
jest.mock("@livekit/components-react", () => ({
  useRoomContext: jest.fn(),
  RoomContext: {
    Provider: ({ children, value }: any) => children,
  },
}));

jest.mock("livekit-client", () => ({
  RoomEvent: {
    RecordingStatusChanged: "recordingStatusChanged",
  },
}));

// Create a simple wrapper
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => <>{children}</>;
};

describe("useRecording", () => {
  let socket: any;
  const mockRoom = {
    isRecording: false,
    on: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    socket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock useRoomContext to return our mock room
    const { useRoomContext } = require("@livekit/components-react");
    useRoomContext.mockReturnValue(mockRoom);
  });

  function setup(roomOverride = {}) {
    const roomValue = { ...mockRoom, ...roomOverride };
    const { useRoomContext } = require("@livekit/components-react");
    useRoomContext.mockReturnValue(roomValue);

    return renderHook(() => useRecording(socket), {
      wrapper: createWrapper(),
    });
  }

  // Basic functionality tests
  it("should start recording by emitting 'recording_started'", () => {
    const { result } = setup();
    act(() => {
      result.current.startRecording();
    });
    expect(socket.emit).toHaveBeenCalledWith("recording_started", {});
  });

  it("should stop recording by emitting 'recording_finished' with egressId", () => {
    const { result } = setup();

    // Setup egressId first
    act(() => {
      result.current.startRecording();
      // Simulate socket response
      const startedCallback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_started"
      )?.[1];
      if (startedCallback) {
        startedCallback({ egressId: "test-egress-id" });
      }
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(socket.emit).toHaveBeenCalledWith("recording_finished", {
      egressId: "test-egress-id",
    });
  });

  it("should not stop recording if no egressId is set", () => {
    const { result } = setup();
    act(() => {
      result.current.stopRecording();
    });
    expect(socket.emit).not.toHaveBeenCalledWith(
      "recording_finished",
      expect.anything()
    );
  });

  it("should update overflowInfo on storage overflow event", () => {
    const overflow: OverflowInfo = {
      totalVideoSize: 1000,
      constraint: 500,
      causedById: 1,
    };
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_storage_overflow"
      )?.[1];
      if (callback) {
        callback(overflow);
      }
    });

    expect(result.current.overflowInfo).toEqual(overflow);
  });

  it("should reduce overflowInfo when deleting files", () => {
    const overflow: OverflowInfo = {
      totalVideoSize: 1000,
      constraint: 500,
      causedById: 1,
    };
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_storage_overflow"
      )?.[1];
      if (callback) {
        callback(overflow);
      }
    });

    act(() => {
      result.current.deleteFiles([{ fileSize: 200 } as RoomFile]);
    });

    expect(result.current.overflowInfo?.totalVideoSize).toBe(800);
  });

  it("should handle deleteFiles when no overflowInfo exists", () => {
    const { result } = setup();
    act(() => {
      result.current.deleteFiles([{ fileSize: 200 } as RoomFile]);
    });
    expect(result.current.overflowInfo).toBeUndefined();
  });

  it("should reset overflowInfo", () => {
    const overflow: OverflowInfo = {
      totalVideoSize: 1000,
      constraint: 500,
      causedById: 1,
    };
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_storage_overflow"
      )?.[1];
      if (callback) {
        callback(overflow);
      }
    });

    act(() => result.current.resetOverflowInfo());
    expect(result.current.overflowInfo).toBeUndefined();
  });

  // Recording status tests
  it("should initialize with room recording status", () => {
    const { result } = setup({ isRecording: true });
    expect(result.current.isRecording).toBe(true);
  });

  it("should set recording status info on recording started", () => {
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_started"
      )?.[1];
      if (callback) {
        callback({ egressId: "123" });
      }
    });

    expect(result.current.recordingStatusInfo).toEqual({
      text: "Начата запись встречи",
      severity: "info",
    });
  });

  it("should set recording status info on recording finished", () => {
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_finished"
      )?.[1];
      if (callback) {
        callback({ egressId: "123" });
      }
    });

    expect(result.current.recordingStatusInfo).toEqual({
      text: "Запись встречи закончена",
      severity: "info",
    });
  });

  it("should set error status info on recording error", () => {
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_error"
      )?.[1];
      if (callback) {
        callback();
      }
    });

    expect(result.current.recordingStatusInfo).toEqual({
      text: "Ошибка записи. Попробуйте позже",
      severity: "error",
    });
    expect(result.current.recordingPending).toBe(false);
  });

  it("should reset recording status info", () => {
    const { result } = setup();

    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_started"
      )?.[1];
      if (callback) {
        callback({ egressId: "123" });
      }
    });

    act(() => {
      result.current.resetStatus();
    });

    expect(result.current.recordingStatusInfo).toBeUndefined();
  });

  // Recording click handler tests
  it("should start recording when not currently recording", () => {
    const { result } = setup({ isRecording: false });

    act(() => {
      result.current.handleRecordingClick();
    });

    expect(socket.emit).toHaveBeenCalledWith("recording_started", {});
    expect(result.current.recordingPending).toBe(true);
  });

  it("should stop recording when currently recording and egressId is set", () => {
    const { result } = setup({ isRecording: true });

    // Set egressId first
    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_started"
      )?.[1];
      if (callback) {
        callback({ egressId: "123" });
      }
    });

    act(() => {
      result.current.handleRecordingClick();
    });

    expect(socket.emit).toHaveBeenCalledWith("recording_finished", {
      egressId: "123",
    });
    expect(result.current.recordingPending).toBe(false);
  });

  // Cleanup tests
  it("should cleanup socket listeners on unmount", () => {
    const { unmount } = setup();

    unmount();

    // Check that off was called for each event
    const events = [
      "recording_started",
      "recording_finished",
      "recording_storage_overflow",
      "recording_error",
    ];

    events.forEach((event) => {
      expect(socket.off).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });

  it("should cleanup room event listeners on unmount", () => {
    const { unmount } = setup();

    unmount();

    expect(mockRoom.off).toHaveBeenCalledWith(
      "recordingStatusChanged",
      expect.any(Function)
    );
  });

  // Edge cases
  it("should work without socket", () => {
    const { result } = renderHook(() => useRecording(null), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startRecording();
      result.current.stopRecording();
      result.current.handleRecordingClick();
    });

    expect(result.current.overflowInfo).toBeUndefined();
  });

  it("should handle recording error and reset pending state", () => {
    const { result } = setup();

    // Set pending state first
    act(() => {
      result.current.handleRecordingClick();
    });
    expect(result.current.recordingPending).toBe(true);

    // Trigger error
    act(() => {
      const callback = socket.on.mock.calls.find(
        ([event]: [string]) => event === "recording_error"
      )?.[1];
      if (callback) {
        callback();
      }
    });

    expect(result.current.recordingPending).toBe(false);
  });
});
