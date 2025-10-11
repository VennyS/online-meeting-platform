import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  components: {
    MuiAccordion: {
      styleOverrides: {
        root: {
          "&.Mui-expanded": {
            paddingBottom: 12,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: "unset !important",
          padding: "12px",
          "&.Mui-expanded": {
            minHeight: "unset !important",
          },
        },
        content: {
          margin: 0,
          paddingTop: 0,
          paddingBottom: 0,
          "&.Mui-expanded": {
            margin: 0,
            paddingTop: 0,
            paddingBottom: 0,
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 8,
          paddingRight: 8,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          padding: "12px 16px 8px 7px",
        },
      },
    },
  },
});
