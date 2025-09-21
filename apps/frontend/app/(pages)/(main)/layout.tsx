"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isModalOpened, setIsModalOpened] = useState(false);
  useEffect(() => {
    setIsModalOpened(pathname.includes("create-meet"));
  }, [pathname]);

  return (
    <>
      {children}
      {isModalOpened && modal}
    </>
  );
}
