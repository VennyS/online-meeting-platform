import { renderHook, act } from "@testing-library/react";
import { usePresentation } from "./usePresentation";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { mockHook } from "../lib/test.lib";

jest.mock("@livekit/components-react");

describe("usePresentation", () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockHook(useLocalParticipant, {
      localParticipant: { identity: "local1", sid: "sid1", name: "Local" },
    });

    mockHook(useRemoteParticipants, [
      { identity: "remote1", sid: "sid2", name: "Remote" },
    ]);
  });

  it("should start a presentation", () => {
    const { result } = renderHook(() => usePresentation(mockSocket));

    act(() => {
      result.current.start(1, "url", "presentationOnly");
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("presentation_started", {
      fileId: 1,
      url: "url",
      mode: "presentationOnly",
    });
  });

  it("should change page", () => {
    const { result } = renderHook(() => usePresentation(mockSocket));

    act(() => {
      result.current.changePage("pres1", 5);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("presentation_page_changed", {
      presentationId: "pres1",
      page: 5,
    });
  });

  it("should finish a presentation", () => {
    const { result } = renderHook(() => usePresentation(mockSocket));

    act(() => {
      result.current.finishPresentation("pres1");
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("presentation_finished", {
      presentationId: "pres1",
    });
  });

  it("should register and cleanup socket events", () => {
    renderHook(() => usePresentation(mockSocket));

    expect(mockSocket.on).toHaveBeenCalledWith(
      "presentations_init",
      expect.any(Function)
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      "presentation_started",
      expect.any(Function)
    );

    const cleanup = renderHook(() => usePresentation(mockSocket)).unmount;
    cleanup();

    expect(mockSocket.off).toHaveBeenCalledWith(
      "presentations_init",
      expect.any(Function)
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      "presentation_started",
      expect.any(Function)
    );
  });
});
