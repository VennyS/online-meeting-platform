import { useParticipantsContext } from "@/app/providers/participants.provider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import styles from "./RightPanel.module.css";

const RightPanel = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { handleChangeOpenPanel } = useParticipantsContext();

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: "grey.100",
        borderRadius: "12px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
      }}
      className={className}
    >
      <div className={styles.panelHeader}>
        <Typography
          variant="h5"
          sx={{ fontFamily: "inherit", fontWeight: "bold" }}
        >
          {title}
        </Typography>
        <IconButton
          title="Закрыть"
          className={styles.closePanelButton}
          onClick={() => handleChangeOpenPanel(undefined)}
          sx={{ color: "#000000b5" }}
        >
          <CloseIcon />
        </IconButton>
      </div>
      {children}
    </Paper>
  );
};

export default RightPanel;
