import axios, { AxiosError, AxiosInstance } from "axios";

/**
 * Frontend API base URL.
 *
 * Override with VITE_API_BASE_URL in .env files for environment-specific routing.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

/**
 * Structured error payload surfaced by the backend.
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  description?: string;
}

/**
 * Application-level API error with optional HTTP status.
 */
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Returns a persisted access token for authenticated requests.
 */
function getAccessToken(): string | null {
  return localStorage.getItem("insideout_access_token") ?? localStorage.getItem("access_token");
}

/**
 * Shared Axios instance used by all endpoint modules.
 *
 * Includes:
 * - sensible timeout defaults
 * - auth token injection
 * - error normalization for consistent UI handling
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    const message =
      payload?.message ??
      payload?.description ??
      payload?.error ??
      error.message ??
      "An unexpected API error occurred.";

    return Promise.reject(new ApiError(message, status));
  },
);
