import axios from "axios";
import { envConfig } from "../config/config";

export const axiosClassic = axios.create({
  baseURL: envConfig.apiUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
