const env = process.env;

export const envConfig = {
  baseUrl: env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  livekitUrl: env.NEXT_PUBLIC_LIVEKIT_URL ?? "http://localhost:7880",
  apiUrl: env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  platformApiUrl: env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080",
  platformUrl: env.NEXT_PUBLIC_PLATFORM_URL ?? "https://ru.noimann.academy",
} as const;
