export const getWebSocketUrl = (
  roomName: string,
  userId: string | number,
  isHost?: boolean
): string => {
  // Получаем базовый URL из переменной окружения
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Парсим URL чтобы получить протокол, хост и порт
  const url = new URL(apiUrl);

  // Определяем протокол для WebSocket
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";

  // Формируем базовый WebSocket URL
  const wsBaseUrl = `${protocol}//${url.host}/ws`;

  // Добавляем query параметры
  const searchParams = new URLSearchParams({
    roomId: roomName,
    userId: userId.toString(),
    isHost: String(isHost),
  });

  return `${wsBaseUrl}?${searchParams.toString()}`;
};
