import Link from "next/link";
import { SafeLinkProps } from "./types";

export default function SafeLink({
  href,
  isExternal,
  children,
}: SafeLinkProps) {
  const safeHref = isExternal
    ? `/redirect?to=${encodeURIComponent(href)}`
    : href;

  return (
    <Link
      href={safeHref}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      {children}
    </Link>
  );
}
