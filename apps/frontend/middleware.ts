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

  // 1. Если это страница комнаты — проверяем гостевой доступ
  if (pathname.startsWith("/room/")) {
    const roomId = pathname.split("/")[2];
    console.log("[MIDDLEWARE] Проверка гостевого доступа для комнаты:", roomId);

    try {
      const checkRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/room/${roomId}/guest-allowed`
      );

      console.log(
        "[MIDDLEWARE] Ответ проверки гостевого доступа:",
        checkRes.status
      );

      if (checkRes.ok) {
        const { guestAllowed } = await checkRes.json();
        console.log("[MIDDLEWARE] guestAllowed =", guestAllowed);

        if (guestAllowed) {
          console.log("[MIDDLEWARE] Гостевой вход разрешён, пропускаем");
          return NextResponse.next();
        }
      }
    } catch (err) {
      console.error("[MIDDLEWARE] Ошибка проверки гостевого режима:", err);
    }

    console.log("[MIDDLEWARE] Гостевой вход запрещён, переходим к авторизации");
  }

  // 2. Стандартная проверка авторизации
  const token = req.cookies.get(CookiesEnum.ACCESS_TOKEN)?.value;
  console.log("[MIDDLEWARE] Найден токен:", token ? "да" : "нет");

  if (!token) {
    console.log("[MIDDLEWARE] Токен отсутствует, редирект");
    const res = NextResponse.redirect(REDIRECT_URL);
    removeAccessToken(true, res);
    return res;
  }

  try {
    console.log("[MIDDLEWARE] Проверка токена через API");
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

    console.log("[MIDDLEWARE] Статус ответа auth/check:", apiRes.status);

    if (!apiRes.ok) {
      console.log("[MIDDLEWARE] API вернул ошибку, редирект");
      const res = NextResponse.redirect(REDIRECT_URL);
      removeAccessToken(true, res);
      return res;
    }

    const data = await apiRes.json();
    console.log("[MIDDLEWARE] Ответ от API:", data);

    if (!data.token) {
      console.log("[MIDDLEWARE] В ответе нет нового токена, редирект");
      const res = NextResponse.redirect(REDIRECT_URL);
      removeAccessToken(true, res);
      return res;
    }

    console.log("[MIDDLEWARE] Авторизация успешна, сохраняем токен");
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|public).*)"],
};
