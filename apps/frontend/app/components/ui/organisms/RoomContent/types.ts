export type Panel = "chat" | "participants" | "files";

export type RoomContentProps = {
  roomId: string;
  roomName: string;
  hideControls?: boolean;
};
