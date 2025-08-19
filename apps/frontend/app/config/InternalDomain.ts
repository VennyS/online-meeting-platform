export const INTERNAL_DOMAINS = [
  "ru.noimann.academy",
  "meet.noimann.academy",
  ...(process.env.NODE_ENV === "development" ? ["localhost:3000"] : []),
];
