import { NextRequest, NextResponse } from "next/server";
import {
  CookiesEnum,
  removeAccessToken,
  saveAccessToken,
} from "./app/services/auth-token.service";
import { authService } from "./app/services/auth.service";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(CookiesEnum.ACCESS_TOKEN)?.value;

  const redirectUrl =
    process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://ru.noimann.academy/";

  if (!token) {
    const res = NextResponse.redirect(redirectUrl);
    removeAccessToken(true, res);
    return res;
  }

  try {
    const data = await authService.checkToken();

    if (!data.token) {
      const res = NextResponse.redirect(redirectUrl);
      removeAccessToken(true, res);
      return res;
    }

    const res = NextResponse.next();
    saveAccessToken(data.token, true, res);
    return res;
  } catch (error) {
    console.error("Ошибка при проверке токена:", error);
    const res = NextResponse.redirect(redirectUrl);
    removeAccessToken(true, res);
    return res;
  }
}
