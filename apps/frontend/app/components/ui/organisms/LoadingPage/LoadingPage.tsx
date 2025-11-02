import { CircularProgress, Stack } from "@mui/material";

export const LoadingPage = () => (
  <Stack
    alignItems="center"
    justifyContent="center"
    minHeight="100vh"
    spacing={2}
  >
    <CircularProgress />
  </Stack>
);
