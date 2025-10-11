import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { ModalProps } from "./types";
import CloseIcon from "@mui/icons-material/Close";

export const Modal = ({ children, onClose, title }: ModalProps) => {
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="body"
      slotProps={{
        paper: {
          sx: { borderRadius: 2, p: "20px", bgcolor: "grey.100" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: !!title ? "space-between" : "flex-end",
          pb: "8px",
        }}
      >
        {title && (
          <DialogTitle variant="h5" sx={{ p: 0 }}>
            {title}
          </DialogTitle>
        )}
        <IconButton
          title="Закрыть"
          onClick={onClose}
          sx={{ color: "#000000b5" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0 }}>{children}</DialogContent>
    </Dialog>
  );
};
