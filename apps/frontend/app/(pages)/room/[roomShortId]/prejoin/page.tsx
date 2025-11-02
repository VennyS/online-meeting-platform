"use client";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Alert,
  Collapse,
  Fade,
} from "@mui/material";
import { LoadingPage } from "@/app/components/ui/organisms/LoadingPage/LoadingPage";
import { TimeChips } from "@/app/components/ui/organisms/TimeChips/TimeChips";
import { usePrejoin } from "@/app/hooks/usePrejoin";
import { useParams } from "next/navigation";
import { useRoomGuard } from "@/app/hooks/useRoomGuard";

export default function PrejoinPage() {
  const { roomShortId } = useParams() as { roomShortId: string };
  useRoomGuard(roomShortId);
  const {
    prequisites,
    user,
    userLoading,
    preqLoading,
    guestName,
    setGuestName,
    password,
    setPassword,
    error,
    connecting,
    countdown,
    fieldDisabled,
    buttonDisabled,
    handleJoin,
  } = usePrejoin(roomShortId);

  if (preqLoading || userLoading) return <LoadingPage />;

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={2}
    >
      <Fade in>
        <Card sx={{ maxWidth: 480, width: "100%", borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {prequisites.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {prequisites.description}
                </Typography>
              </Box>

              {countdown && (
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Встреча начнётся через:
                  </Typography>
                  <TimeChips time={countdown} />
                </Box>
              )}

              {prequisites.guestAllowed && !user && (
                <TextField
                  label="Ваше имя"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={fieldDisabled}
                />
              )}

              {prequisites.passwordRequired && (
                <TextField
                  label="Пароль"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={fieldDisabled}
                />
              )}

              <Button
                variant="contained"
                onClick={handleJoin}
                disabled={buttonDisabled}
              >
                {connecting ? "Подключение..." : "Войти"}
              </Button>

              <Collapse
                in={!!error}
                sx={{ m: !!error ? "auto" : "0px !important" }}
              >
                <Alert severity="error">{error}</Alert>
              </Collapse>

              <Collapse
                in={connecting && prequisites.waitingRoomEnabled && !error}
                sx={{
                  m:
                    connecting && prequisites.waitingRoomEnabled && !error
                      ? "auto"
                      : "0px !important",
                }}
              >
                <Alert severity="info">
                  Ожидаем одобрения от организатора...
                </Alert>
              </Collapse>
            </Stack>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}
