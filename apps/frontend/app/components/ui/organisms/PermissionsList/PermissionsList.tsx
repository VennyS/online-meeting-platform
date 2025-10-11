import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import { Permissions, RoomRole } from "@/app/types/room.types";
import { useParticipantsContext } from "@/app/providers/participants.provider";

const PermissionsList = () => {
  const { local, permissionsMap, updateRolePermissions } =
    useParticipantsContext();

  function getPermissionValue(permission: keyof Permissions): RoomRole | "all" {
    const ownerHas = permissionsMap["owner"]?.permissions[permission];
    const adminHas = permissionsMap["admin"]?.permissions[permission];
    const participantHas =
      permissionsMap["participant"]?.permissions[permission];

    if (ownerHas && adminHas && participantHas) return "all";
    if (ownerHas && adminHas && !participantHas) return "admin";
    if (ownerHas && !adminHas && !participantHas) return "owner";
    return "owner";
  }

  const isOwner = local.permissions.role === "owner";

  const handlePermissionChange = (
    permission: keyof Permissions,
    value: RoomRole | "all",
    set: (role: RoomRole | "all") => void
  ) => {
    if (value === "all") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, true);
      updateRolePermissions("participant", permission, true);
      set("all");
    } else if (value === "admin") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, true);
      updateRolePermissions("participant", permission, false);
      set("admin");
    } else if (value === "owner") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, false);
      updateRolePermissions("participant", permission, false);
      set("owner");
    }
  };

  const [canShareScreenValue, setCanShareScreenValue] = useState<
    RoomRole | "all"
  >(getPermissionValue("canShareScreen"));
  const [canStartPresentationValue, setCanStartPresentationValue] = useState<
    RoomRole | "all"
  >(getPermissionValue("canStartPresentation"));

  const roleOptions: { label: string; value: RoomRole | "all" }[] = [
    { label: "Только владелец", value: "owner" },
    { label: "Владелец и админ", value: "admin" },
    { label: "Все", value: "all" },
  ];

  useEffect(() => {
    if (
      permissionsMap.owner &&
      permissionsMap.admin &&
      permissionsMap.participant
    ) {
      const shareScreenValue = getPermissionValue("canShareScreen");
      const startPresentationValue = getPermissionValue("canStartPresentation");
      setCanShareScreenValue(shareScreenValue);
      setCanStartPresentationValue(startPresentationValue);
    }
  }, [permissionsMap]);

  if (!isOwner) return null;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ flexGrow: 1 }}>Права</Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Могут делиться экраном</InputLabel>
            <Select
              value={canShareScreenValue}
              label="Могут делиться экраном"
              onChange={(e) =>
                handlePermissionChange(
                  "canShareScreen",
                  e.target.value,
                  setCanShareScreenValue
                )
              }
            >
              {roleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Могут делиться презентацией</InputLabel>
            <Select
              value={canStartPresentationValue}
              label="Могут делиться презентацией"
              onChange={(e) =>
                handlePermissionChange(
                  "canStartPresentation",
                  e.target.value,
                  setCanStartPresentationValue
                )
              }
            >
              {roleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Можно добавить другие права аналогично */}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default PermissionsList;
