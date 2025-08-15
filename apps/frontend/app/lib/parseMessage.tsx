import SafeLink from "../components/ui/atoms/SafeLink/SafeLink";
import { isExternalLink } from "./isExternalLink";

const urlRegex = /(https?:\/\/[^\s]+)/;

export const parseMessage = (text: string) => {
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Если это ссылка
    if (/^https?:\/\//.test(part)) {
      const isExternal = isExternalLink(part);

      return (
        <SafeLink key={i} href={part} isExternal={isExternal}>
          {part}
        </SafeLink>
      );
    }

    // Обычный текст
    return <span key={i}>{part}</span>;
  });
};
