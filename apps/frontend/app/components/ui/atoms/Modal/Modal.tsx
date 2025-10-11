import { Dialog, DialogContent } from "@mui/material";
import { ModalProps } from "./types";

export const Modal = ({ children, onClose }: ModalProps) => {
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: { borderRadius: 2, p: 2 },
        },
      }}
    >
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
};
