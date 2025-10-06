import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import React, { useState } from "react";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import { RoomRoleMap } from "@/app/types/room.types";

const ParticipantsList = () => {
  const { local, remote, updateUserRole, addToBlackList } =
    useParticipantsContext();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const participants = [local, ...remote];

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    participantId: string,
    name: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedId(participantId);
    setName(name);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedId(null);
    setName("");
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flexGrow: 1, m: 0 }}>Участники</Typography>
        <Typography variant="caption" color="text.secondary">
          {participants.length}
        </Typography>
      </AccordionSummary>

      <AccordionDetails>
        {participants.map(({ participant, permissions }) => {
          const role = permissions.role;

          return (
            <Box
              key={participant.sid}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar>{participant.name?.charAt(0)}</Avatar>
                <Box>
                  <Typography>
                    {participant.name || participant.identity || "Аноним"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {RoomRoleMap[role]}
                  </Typography>
                </Box>
              </Box>
              {local.permissions.role === "owner" &&
                participant.identity != local.participant.identity && (
                  <IconButton
                    size="small"
                    onClick={(e) =>
                      handleOpenMenu(
                        e,
                        participant.identity,
                        participant.name || participant.identity || "Аноним"
                      )
                    }
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
            </Box>
          );
        })}
      </AccordionDetails>

      {/* Выпадающее меню для действий */}
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            updateUserRole(selectedId!, "admin");
            handleCloseMenu();
          }}
        >
          Сделать админом
        </MenuItem>
        <MenuItem
          onClick={() => {
            updateUserRole(selectedId!, "participant");
            handleCloseMenu();
          }}
        >
          Сделать участником
        </MenuItem>
        <MenuItem
          onClick={() => {
            addToBlackList(selectedId!, name);
            handleCloseMenu();
          }}
        >
          Исключить
        </MenuItem>
      </Menu>
    </Accordion>
  );
};

export default ParticipantsList;
