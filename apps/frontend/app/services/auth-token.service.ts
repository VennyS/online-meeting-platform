import Cookies from "js-cookie";
import { NextResponse } from "next/server";

export enum CookiesEnum {
  ACCESS_TOKEN = "auth-token",
}

/**
 * Установить access token.
 * @param token - строка токена
 * @param isServer - true если вызывается на сервере (middleware, route handler и т.п.)
 * @param res - объект NextResponse, нужен только на сервере для установки куки
 */
export function saveAccessToken(
  token: string,
  isServer = false,
  res?: NextResponse
) {
  if (isServer) {
    if (!res) throw new Error("NextResponse is required on server");
    res.cookies.set(CookiesEnum.ACCESS_TOKEN, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      domain: ".noimann.academy",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 день
    });
  } else {
    Cookies.set(CookiesEnum.ACCESS_TOKEN, token, {
      domain: ".noimann.academy",
      path: "/",
      expires: 1,
      sameSite: "strict",
      secure: true,
    });
  }
}

/**
 * Удалить access token.
 * @param isServer - true если вызывается на сервере
 * @param res - объект NextResponse для сервера
 */
export function removeAccessToken(isServer = false, res?: NextResponse) {
  if (isServer) {
    if (!res) throw new Error("NextResponse is required on server");
    res.cookies.set(CookiesEnum.ACCESS_TOKEN, "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      domain: ".noimann.academy",
      expires: new Date(0),
    });
  } else {
    Cookies.remove(CookiesEnum.ACCESS_TOKEN, {
      domain: ".noimann.academy",
      path: "/",
    });
  }
}
