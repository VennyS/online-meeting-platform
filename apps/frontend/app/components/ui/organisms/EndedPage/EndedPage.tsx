"use client";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";
import { EndedPageProps } from "./types";
import { useUser } from "@/app/hooks/useUser";
import { useParams } from "next/navigation";

export function EndedPage({ title, reason, backButton }: EndedPageProps) {
  const { roomShortId } = useParams() as { roomShortId: string };

  const { user } = useUser();

  const canGoHome = user && !user.isGuest;

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      maxHeight="100vh"
      p={3}
      textAlign="center"
      boxSizing="border-box"
    >
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {title}
      </Typography>

      {reason && (
        <Typography variant="body1" sx={{ mb: 4, maxWidth: 500 }}>
          {reason}
        </Typography>
      )}

      <div>
        {backButton && (
          <Button component={Link} href="/" variant="outlined">
            Назад
          </Button>
        )}
        {canGoHome && (
          <Button component={Link} href="/" variant="contained">
            На главную
          </Button>
        )}
      </div>
    </Box>
  );
}
