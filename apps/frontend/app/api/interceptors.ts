import axios from "axios";

export const axiosClassic = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

export const axiosPlatform = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PLATFORM_API_URL,
  headers: { "Content-Type": "application/json" },
});
