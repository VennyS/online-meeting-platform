export type WSMessage<E extends string, D> = {
  event: E;
  data: D;
};

export type WSSendMessage = WSMessage<'ready', {}>;
