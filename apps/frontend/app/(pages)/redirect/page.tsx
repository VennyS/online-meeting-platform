"use client";

import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RedirectContent() {
  const searchParams = useSearchParams();
  const to = searchParams.get("to");

  if (!to) return <p>Неверный адрес</p>;

  const decoded = decodeURIComponent(to);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <Typography variant="h4">Вы покидаете сайт</Typography>
      <Typography variant="body1">
        Сейчас вы перейдёте по внешней ссылке:
      </Typography>
      <Typography variant="body1" sx={{ wordBreak: "break-word", mb: 2 }}>
        {decoded}
      </Typography>
      <Button href={decoded} variant="contained" LinkComponent={Link}>
        Перейти
      </Button>
    </Box>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p>Загрузка ссылки...</p>}>
      <RedirectContent />
    </Suspense>
  );
}
