import { renderHook, act } from "@testing-library/react";
import { useRecording, OverflowInfo } from "./useRecording";
import { RoomFile } from "../types/files.types";

describe("useRecording", () => {
  let socket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    socket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
  });

  function setup() {
    return renderHook(() => useRecording(socket));
  }

  it("should start recording by emitting 'recording_started'", () => {
    const { result } = setup();
    act(() => {
      result.current.startRecording();
    });
    expect(socket.emit).toHaveBeenCalledWith("recording_started", {});
  });

  it("should stop recording by emitting 'recording_finished' with egressId", () => {
    const { result } = setup();
    act(() => {
      socket.on.mock.calls.forEach(([event, cb]: any) => {
        if (event === "recording_started") cb({ egressId: "123" });
      });
    });
    act(() => {
      result.current.stopRecording();
    });
    expect(socket.emit).toHaveBeenCalledWith("recording_finished", {
      egressId: "123",
    });
  });

  it("should update overflowInfo on storage overflow event", () => {
    const overflow: OverflowInfo = {
      totalVideoSize: 1000,
      constraint: 500,
      causedById: 1,
    };
    const { result } = setup();
    const callback = socket.on.mock.calls.find(
      ([e]: any) => e === "recording_storage_overflow"
    )![1];
    act(() => callback(overflow));
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
        ([e]: any) => e === "recording_storage_overflow"
      )![1];
      callback(overflow);
    });
    act(() => {
      result.current.deleteFiles([{ fileSize: 200 } as RoomFile]);
    });
    expect(result.current.overflowInfo?.totalVideoSize).toBe(800);
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
        ([e]: any) => e === "recording_storage_overflow"
      )![1];
      callback(overflow);
    });
    act(() => result.current.resetOverflowInfo());
    expect(result.current.overflowInfo).toBeUndefined();
  });

  it("should cleanup socket listeners on unmount", () => {
    const { unmount } = setup();
    const startedCb = socket.on.mock.calls.find(
      ([e]: any) => e === "recording_started"
    )![1];
    const finishedCb = socket.on.mock.calls.find(
      ([e]: any) => e === "recording_finished"
    )![1];
    const overflowCb = socket.on.mock.calls.find(
      ([e]: any) => e === "recording_storage_overflow"
    )![1];
    unmount();
    expect(socket.off).toHaveBeenCalledWith("recording_started", startedCb);
    expect(socket.off).toHaveBeenCalledWith("recording_finished", finishedCb);
    expect(socket.off).toHaveBeenCalledWith(
      "recording_storage_overflow",
      overflowCb
    );
  });
});
