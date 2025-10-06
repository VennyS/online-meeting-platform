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

const Blacklist = () => {
  const { blacklist, removeFromBlackList } = useParticipantsContext();

  if (blacklist.length === 0) return null;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flexGrow: 1 }}>Чёрный список</Typography>
      </AccordionSummary>

      <AccordionDetails>
        {blacklist.map((e) => (
          <Box
            key={e.ip + e.name}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography>{e.name}</Typography>
            <Button
              size="small"
              color="primary"
              variant="outlined"
              onClick={() => removeFromBlackList(e.ip)}
            >
              Вернуть
            </Button>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default Blacklist;
