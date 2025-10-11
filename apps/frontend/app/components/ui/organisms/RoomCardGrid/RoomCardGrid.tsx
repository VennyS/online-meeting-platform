import { getStatusButton } from "@/app/lib/getStatusButton";
import { Box, Button, Card, Link, Stack, Typography } from "@mui/material";
import React from "react";
import { RoomCardGridProps } from "./types";
import { Modal } from "../RoomList/RoomList";

const RoomCardGrid = ({ rooms, onModalOpen }: RoomCardGridProps) => {
  return (
    <Box
      sx={{
        display: "grid",
        width: "100%",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 2,
        mt: 2,
      }}
    >
      {rooms.map((room) => (
        <Card
          key={room.id}
          variant="outlined"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 3,
            p: 2,
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": {
              transform: "translateY(-3px)",
              boxShadow: 3,
            },
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {room.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(room.startAt).toLocaleString("ru-RU")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              mt: 2,
            }}
          >
            {getStatusButton(room)}
            {room.haveReports && (
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  onModalOpen({
                    modal: Modal.Reports,
                    shortId: room.shortId,
                  })
                }
              >
                Отчёты
              </Button>
            )}
            {room.haveFiles && (
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  onModalOpen({
                    modal: Modal.Files,
                    shortId: room.shortId,
                  })
                }
              >
                Файлы
              </Button>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            mt={2}
            flexWrap="wrap"
          >
            <Button
              onClick={() => onModalOpen({ modal: Modal.Edit, room: room })}
              variant="outlined"
              color="primary"
              size="small"
            >
              Изменить
            </Button>
            <Button
              component={Link}
              href={`/room/${room.shortId}`}
              variant="contained"
              color="primary"
              size="small"
            >
              Зайти
            </Button>
          </Stack>
        </Card>
      ))}
    </Box>
  );
};

export default RoomCardGrid;
