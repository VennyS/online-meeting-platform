import { renderHook } from "@testing-library/react";
import { useRoomTracksWithPresentations } from "./useRoomTracksWithPresentations";
import {
  useTracks,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { usePresentationContext } from "../providers/presentation.provider";
import { Track } from "livekit-client";
import { isPresentation } from "../lib/isPresentations";

// Моки хуков
jest.mock("@livekit/components-react");
jest.mock("../providers/presentation.provider");

describe("useRoomTracksWithPresentations", () => {
  let mockTracks: TrackReferenceOrPlaceholder[];
  let mockPresentations: any[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockTracks = [
      {
        participant: {
          sid: "p1",
          isLocal: false,
          permissions: { hidden: false },
        },
        source: Track.Source.Camera,
        publication: { track: {}, isMuted: false },
      } as any,
      {
        participant: {
          sid: "p3",
          isLocal: false,
          permissions: { hidden: false },
        },
        source: Track.Source.Camera,
        publication: { track: {}, isMuted: false },
      } as any,
    ];

    mockPresentations = [
      {
        participant: { sid: "p2" },
        mode: "presentationOnly",
        local: true,
        fileId: "file1",
        authorId: "user1",
      },
      {
        participant: { sid: "p1" },
        mode: "presentationWithCamera",
        local: false,
        fileId: "file2",
        authorId: "user2",
      },
    ];

    (useTracks as jest.Mock).mockReturnValue(mockTracks);
    (usePresentationContext as jest.Mock).mockReturnValue({
      presentations: mockPresentations,
    });
  });

  it("should combine tracks with presentations correctly", () => {
    const { result } = renderHook(() =>
      useRoomTracksWithPresentations({
        includeCamera: true,
        includeScreen: false,
      })
    );

    const presentations = result.current.filter(isPresentation);

    const localPresentation = presentations.find((p) => p.local);
    expect(localPresentation).toBeDefined();
    expect(localPresentation?.local).toBe(true);

    expect(result.current.some((t) => "publication" in t)).toBe(true);
  });

  it("should filter hidden local tracks", () => {
    const hiddenTrack = {
      participant: { sid: "p3", isLocal: true, permissions: { hidden: true } },
      source: Track.Source.Camera,
      publication: { track: {}, isMuted: false },
    } as any;

    (useTracks as jest.Mock).mockReturnValue([...mockTracks, hiddenTrack]);

    const { result } = renderHook(() => useRoomTracksWithPresentations({}));

    expect(result.current).not.toContain(hiddenTrack);
  });

  it("should handle empty tracks gracefully", () => {
    (useTracks as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useRoomTracksWithPresentations({}));

    expect(result.current).toEqual(mockPresentations);
  });
});
