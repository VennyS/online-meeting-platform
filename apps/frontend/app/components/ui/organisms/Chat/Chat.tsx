import { useState } from "react";
import {
  Box,
  Paper,
  List,
  ListItem,
  Typography,
  TextField,
  IconButton,
  Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useChat } from "@/app/hooks/useChat";
import { useUser } from "@/app/hooks/useUser";
import { parseMessage } from "@/app/lib/parseMessage";

export const Chat = () => {
  const { messages, send } = useChat();
  const { user } = useUser();
  const [message, setMessage] = useState("");

  const formatTime = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSend = () => {
    if (!message.trim()) return;
    send(message);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {messages.map((msg, index) => {
            const isMine = msg.user.id === user?.id;
            const from = isMine ? "Вы" : msg.user.firstName;

            return (
              <ListItem
                key={index}
                sx={{
                  flexDirection: "column",
                  alignItems: !isMine ? "flex-end" : "flex-start",
                  px: 0,
                  py: 0,
                  maxWidth: "100%",
                  alignSelf: !isMine ? "flex-end" : "flex-start",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    alignSelf: !isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{ fontWeight: "bold" }}
                    variant="body2"
                    color="text.primary"
                  >
                    {from}
                  </Typography>{" "}
                  • {formatTime(msg.createdAt)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {parseMessage(msg.text)}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: "4px",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Сообщение..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "transparent",
              "& fieldset": { border: "none" },
              "&:hover fieldset": { border: "none" },
              "&.Mui-focused fieldset": { border: "none" },
            },
          }}
        />
        <IconButton
          color="primary"
          sx={{ ml: 1 }}
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};
