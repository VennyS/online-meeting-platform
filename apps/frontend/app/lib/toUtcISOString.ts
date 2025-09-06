import { fromZonedTime } from "date-fns-tz";

/**
 * Преобразует строку формата datetime-local в ISO строку UTC,
 * трактуя введённое пользователем время как указанную таймзону.
 *
 * @param value строка из input[type="datetime-local"], например "2025-09-06T12:30"
 * @param timeZone IANA таймзона, например "Europe/Moscow" или "Asia/Almaty"
 * @returns ISO строка в UTC
 */
export function toUtcISOString(value: string, timeZone: string): string {
  const localDate = new Date(value);
  return fromZonedTime(localDate, timeZone).toISOString();
}
