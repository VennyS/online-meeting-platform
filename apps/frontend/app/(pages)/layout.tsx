"use client";

import { ThemeProvider } from "@mui/material";
import { theme } from "../lib/theme";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
export default Layout;
