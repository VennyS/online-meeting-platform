import { Stack, Typography } from "@mui/material";

export const TimeChips = ({
  time,
}: {
  time: { days: number; hours: number; minutes: number; seconds: number };
}) => {
  const items = [
    time.days > 0 && { value: time.days, label: "дней" },
    { value: time.hours, label: "часов" },
    { value: time.minutes, label: "минут" },
    { value: time.seconds, label: "секунд" },
  ].filter(Boolean) as { value: number; label: string }[];

  return (
    <Stack direction="row" justifyContent="center" spacing={2} flexWrap="wrap">
      {items.map(({ value, label }, i) => (
        <TimeChip key={i} value={value} label={label} />
      ))}
    </Stack>
  );
};

const TimeChip = ({ value, label }: { value: number; label: string }) => (
  <Stack alignItems="center" spacing={0.5}>
    <Typography fontWeight={700} fontSize="1.4rem">
      {String(value).padStart(2, "0")}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Stack>
);
