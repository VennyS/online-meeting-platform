import { Box, Typography } from "@mui/material";
import React from "react";

const FarewellPage = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <Typography variant="h4">Встреча завершена</Typography>
      <Typography variant="body1">Спасибо за участие</Typography>
    </Box>
  );
};

export default FarewellPage;
