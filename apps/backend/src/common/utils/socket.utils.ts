import { TypedSocket } from 'src/modules/ws/interfaces/socket-data.interface';

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
