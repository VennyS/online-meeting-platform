import { TypedSocket } from 'src/modules/ws/interfaces/socket-data.interface';
import type { Request } from 'express';

export function getClientIP(socket: TypedSocket): string {
  // x-forwarded-for содержит цепочку прокси, берем первый IP
  const xForwardedFor = socket.handshake.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const firstIp = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    return firstIp.split(',')[0].trim();
  }

  // x-real-ip иногда используется
  const xRealIp = socket.handshake.headers['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }

  // Обработка фолбэка
  const fallbackAddress = socket.handshake.address;

  // Чистка IPv6 оберток
  if (fallbackAddress?.startsWith('::ffff:')) {
    return fallbackAddress.replace('::ffff:', '');
  }

  return fallbackAddress || 'unknown-ip';
}

export function extractIp(reqOrSocket: Request | TypedSocket): string {
  // 1. Проверяем наличие заголовка x-forwarded-for
  const forwarded =
    (reqOrSocket as any).headers?.['x-forwarded-for'] ||
    (reqOrSocket as any).handshake?.headers?.['x-forwarded-for'];

  // 2. Берем первый IP из списка, если он есть
  const forwardedIp = (
    Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  )?.trim();

  // 3. Фолбэк на прямой IP из Express или Socket.IO
  const directIp =
    (reqOrSocket as Request).ip ||
    (reqOrSocket as TypedSocket).handshake?.address ||
    'unknown';

  // 4. Убираем IPv6-префикс ::ffff:
  const ip = (forwardedIp || directIp).replace(/^::ffff:/, '');

  return ip;
}
