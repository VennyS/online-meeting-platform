import { NextRequest, NextResponse } from "next/server";
import {
  CookiesEnum,
  removeAccessToken,
  saveAccessToken,
} from "./app/services/auth-token.service";

const REDIRECT_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://ru.noimann.academy/";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log("[MIDDLEWARE] Запрос:", pathname);

  if (pathname.includes("/prejoin") || pathname.startsWith("/room/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(CookiesEnum.ACCESS_TOKEN)?.value;

  if (!token) {
    console.log("[MIDDLEWARE] Токен отсутствует, редирект на платформу");
    const res = NextResponse.redirect(REDIRECT_URL);
    removeAccessToken(true, res);
    return res;
  }

  try {
    const apiRes = await fetch(
      `${process.env.NEXT_PUBLIC_PLATFORM_API_URL}/auth/check`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!apiRes.ok) {
      const res = NextResponse.redirect(REDIRECT_URL);
      removeAccessToken(true, res);
      return res;
    }

    const data = await apiRes.json();

    if (!data.token) {
      const res = NextResponse.redirect(REDIRECT_URL);
      removeAccessToken(true, res);
      return res;
    }

    if (pathname.startsWith("/admin") && data.user.roleId !== 4) {
      return NextResponse.rewrite(new URL("/404", req.url));
    }

    const res = NextResponse.next();
    saveAccessToken(data.token, true, res);
    return res;
  } catch (error) {
    console.error("[MIDDLEWARE] Ошибка при проверке токена:", error);
    const res = NextResponse.redirect(REDIRECT_URL);
    removeAccessToken(true, res);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|public|redirect).*)",
  ],
};
