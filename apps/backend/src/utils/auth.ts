export function extractAuthToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  return (
    cookieHeader
      .split("; ")
      .find((c) => c.startsWith("auth-token="))
      ?.split("=")[1] || null
  );
}
