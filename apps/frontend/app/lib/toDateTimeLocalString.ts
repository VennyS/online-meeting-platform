import { toZonedTime, format } from "date-fns-tz";

export function toDateTimeLocalString(
  utc: Date | string,
  timezone: string
): string {
  const date = typeof utc === "string" ? new Date(utc) : utc;
  const zoned = toZonedTime(date, timezone);
  return format(zoned, "yyyy-MM-dd'T'HH:mm");
}
