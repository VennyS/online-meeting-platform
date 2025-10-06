import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useParticipantsContext } from "@/app/providers/participants.provider";

const WaitingGuestsList = () => {
  const { waitingGuests, approveGuest, rejectGuest } = useParticipantsContext();

  if (!waitingGuests || waitingGuests.length === 0) return null;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flexGrow: 1 }}>Ожидающие гости</Typography>
      </AccordionSummary>

      <AccordionDetails>
        {waitingGuests.map((guest) => (
          <Box
            key={guest.guestId}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography>{guest.name}</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                color="success"
                variant="outlined"
                onClick={() => approveGuest(guest.guestId)}
              >
                Одобрить
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => rejectGuest(guest.guestId)}
              >
                Отклонить
              </Button>
            </Box>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default WaitingGuestsList;
