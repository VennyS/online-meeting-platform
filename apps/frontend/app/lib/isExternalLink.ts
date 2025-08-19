import { INTERNAL_DOMAINS } from "../config/InternalDomain";

export const isExternalLink = (href: string) => {
  try {
    const url = new URL(href);
    return !INTERNAL_DOMAINS.includes(url.host);
  } catch {
    // Если не валидный URL — считаем внутренней ссылкой
    return false;
  }
};
